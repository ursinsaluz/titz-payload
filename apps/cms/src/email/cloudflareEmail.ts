import type { EmailAdapter, SendEmailOptions } from 'payload'
import { getCloudflareContext } from '@opennextjs/cloudflare'

/**
 * E-Mail über Cloudflare Email Sending, per Worker-Binding.
 *
 * Payload verschickt selten, aber an heiklen Stellen: «Passwort vergessen» und
 * die Bestätigung neuer Konten. Ohne Adapter schluckt Payload diese Mails still
 * und schreibt nur eine Warnung ins Log — der Link zum Zurücksetzen kommt
 * niemals an.
 *
 * **Warum nicht SMTP, obwohl Cloudflare einen SMTP-Endpunkt anbietet.**
 * `smtp.mx.cloudflare.net:465` funktioniert von überall — nur nicht von hier.
 * Zwei Gründe, beide gemessen:
 *
 * 1. Nodemailer braucht einen rohen TCP-Socket. Workers erlauben ausgehendes
 *    TCP, aber laut Runtime-Doku «outbound TCP sockets to Cloudflare IP ranges
 *    are blocked» — und `smtp.mx.cloudflare.net` löst auf 162.159.205.26–28
 *    auf, also mitten in 162.158.0.0/15. Der Worker darf gerade dorthin nicht.
 * 2. Das Binding braucht überhaupt kein Geheimnis. Beim SMTP-Weg wäre das
 *    Passwort ein Cloudflare-API-Token mit «Email Sending: Edit» — ein Token,
 *    mit dem sich von *jeder* Domain des Kontos Mail verschicken lässt. Das
 *    Binding ist an diesen Worker gebunden und läuft aus, wenn er es tut.
 *
 * Der SMTP-Endpunkt bleibt richtig für alles, was ausserhalb von Workers läuft:
 * ein Skript auf dem Notebook, ein Docker-Dienst, ein Cron auf einem Server.
 *
 * Einrichtung: keine. `titz.cooking` ist unter Email Service → Email Sending
 * freigegeben, das Binding steht in `wrangler.jsonc`. DKIM und ARC setzt
 * Cloudflare selbst.
 */

/**
 * Absender. Muss auf einer Domain liegen, die für Email Sending freigegeben
 * ist — sonst antwortet Cloudflare mit `550 5.7.1 Sender denied`.
 */
const ABSENDER = 'noreply@titz.cooking'
const ABSENDER_NAME = 'Sebastian Titz'

/** Die Adressformen von Nodemailer auf die eine Form des Bindings bringen. */
type Adresse = string | { email: string; name: string }

/**
 * Payload gibt Adressen in den Formen weiter, die Nodemailer kennt: als
 * `'a@b.ch'`, als `'Name <a@b.ch>'` oder als `{ name, address }`. Das Binding
 * kennt nur `'a@b.ch'` und `{ name, email }` — und dort ist `name` Pflicht,
 * nicht optional. Ein `'Name <a@b.ch>'` würde als Adresse durchgereicht und
 * abgelehnt, darum wird es hier zerlegt.
 */
export function alsAdresse(wert: unknown): Adresse | undefined {
  if (typeof wert === 'string') {
    const spitz = wert.match(/^\s*(.*?)\s*<([^>]+)>\s*$/)
    if (!spitz) return wert.trim() || undefined
    const [, name, email] = spitz
    return name ? { name: name.replace(/^"|"$/g, ''), email } : email
  }
  if (wert && typeof wert === 'object') {
    const { name, address } = wert as { name?: unknown; address?: unknown }
    if (typeof address !== 'string') return undefined
    return typeof name === 'string' && name ? { name, email: address } : address
  }
  return undefined
}

/** Dasselbe für Empfängerfelder, die auch Listen sein dürfen. */
export function alsEmpfaenger(wert: unknown): Adresse[] | undefined {
  const rohe = Array.isArray(wert) ? wert : [wert]
  const adressen = rohe.map(alsAdresse).filter((a): a is Adresse => a !== undefined)
  return adressen.length ? adressen : undefined
}

/**
 * Aus einer Payload-Nachricht die Nachricht für das Binding bauen. Getrennt von
 * `sendEmail`, damit die Umformung ohne Worker-Umgebung geprüft werden kann.
 */
export function alsNachricht(message: SendEmailOptions) {
  const empfaenger = alsEmpfaenger(message.to)
  if (!empfaenger) throw new Error('E-Mail ohne Empfänger')

  return {
    to: empfaenger,
    cc: alsEmpfaenger(message.cc),
    bcc: alsEmpfaenger(message.bcc),
    from: alsAdresse(message.from) ?? { name: ABSENDER_NAME, email: ABSENDER },
    replyTo: alsAdresse(message.replyTo),
    subject: message.subject ?? '',
    text: typeof message.text === 'string' ? message.text : undefined,
    html: typeof message.html === 'string' ? message.html : undefined,
  }
}

export const cloudflareEmail: EmailAdapter<{ messageId: string } | undefined> = ({ payload }) => ({
  name: 'cloudflare-email-sending',
  defaultFromAddress: ABSENDER,
  defaultFromName: ABSENDER_NAME,

  async sendEmail(message) {
    const nachricht = alsNachricht(message)

    // Lokal gibt es das Binding nicht: `send_email` steht ohne `remote: true`
    // in der Konfiguration, damit ein `next dev` nicht versehentlich echte Mail
    // verschickt. Statt zu scheitern wird die Nachricht geloggt — beim
    // Zurücksetzen eines Passworts steht der Link damit im Terminal.
    let binding: CloudflareEnv['EMAIL'] | undefined
    try {
      binding = (await getCloudflareContext({ async: true }))?.env?.EMAIL
    } catch {
      // Kein Worker-Kontext — CLI, Seed oder Test.
    }

    if (!binding) {
      payload.logger.info({
        msg: 'Kein EMAIL-Binding — Nachricht wird nicht verschickt, nur protokolliert',
        an: nachricht.to,
        betreff: nachricht.subject,
        text: nachricht.text,
      })
      return undefined
    }

    return binding.send(nachricht)
  },
})
