import { describe, expect, it } from 'vitest'

import { alsAdresse, alsEmpfaenger, alsNachricht } from '../../src/email/cloudflareEmail'

/**
 * Payload gibt Adressen in den Formen von Nodemailer weiter, das Binding kennt
 * nur zwei davon. Eine Form, die falsch durchgereicht wird, führt nicht zu einem
 * Typfehler, sondern zu `550 Sender denied` oder einer Mail an niemanden — und
 * das fällt erst auf, wenn jemand sein Passwort zurücksetzen will.
 */

describe('alsAdresse', () => {
  it('lässt eine nackte Adresse in Ruhe', () => {
    expect(alsAdresse('a@titz.cooking')).toBe('a@titz.cooking')
  })

  it('zerlegt «Name <adresse>», statt es als Adresse durchzureichen', () => {
    expect(alsAdresse('Sebastian Titz <chef@titz.cooking>')).toEqual({
      name: 'Sebastian Titz',
      email: 'chef@titz.cooking',
    })
  })

  it('nimmt die Anführungszeichen weg, die Nodemailer um den Namen setzt', () => {
    expect(alsAdresse('"Titz, Sebastian" <chef@titz.cooking>')).toEqual({
      name: 'Titz, Sebastian',
      email: 'chef@titz.cooking',
    })
  })

  it('übersetzt das Objekt von Nodemailer auf das Feld des Bindings', () => {
    // Nodemailer nennt es `address`, das Binding `email`. Ohne Umbenennung
    // käme ein Objekt ohne Adresse an.
    expect(alsAdresse({ name: 'Titz', address: 'chef@titz.cooking' })).toEqual({
      name: 'Titz',
      email: 'chef@titz.cooking',
    })
  })

  it('gibt eine Adresse ohne Namen als Zeichenkette zurück', () => {
    // `EmailAddress` verlangt `name` als Pflichtfeld — ein Objekt ohne Namen
    // wäre kein gültiger Wert.
    expect(alsAdresse({ address: 'chef@titz.cooking' })).toBe('chef@titz.cooking')
  })

  it('meldet nichts, wo nichts ist', () => {
    expect(alsAdresse(undefined)).toBeUndefined()
    expect(alsAdresse('')).toBeUndefined()
    expect(alsAdresse({ name: 'ohne Adresse' })).toBeUndefined()
  })
})

describe('alsEmpfaenger', () => {
  it('macht aus einem einzelnen Empfänger eine Liste', () => {
    expect(alsEmpfaenger('a@titz.cooking')).toEqual(['a@titz.cooking'])
  })

  it('behält mehrere Empfänger und mischt die Formen', () => {
    expect(alsEmpfaenger(['a@titz.cooking', { name: 'B', address: 'b@titz.cooking' }])).toEqual([
      'a@titz.cooking',
      { name: 'B', email: 'b@titz.cooking' },
    ])
  })

  it('gibt undefined statt einer leeren Liste zurück', () => {
    // Eine leere Liste in `cc` würde das Binding als gesetztes Feld sehen.
    expect(alsEmpfaenger([])).toBeUndefined()
    expect(alsEmpfaenger(undefined)).toBeUndefined()
  })
})

describe('alsNachricht', () => {
  it('setzt den eigenen Absender ein, wenn Payload keinen mitgibt', () => {
    const n = alsNachricht({ to: 'a@titz.cooking', subject: 'Test' })
    expect(n.from).toEqual({ name: 'Sebastian Titz', email: 'noreply@titz.cooking' })
  })

  it('lässt einen mitgegebenen Absender stehen', () => {
    const n = alsNachricht({ to: 'a@titz.cooking', from: 'chef@titz.cooking', subject: 'x' })
    expect(n.from).toBe('chef@titz.cooking')
  })

  it('bricht ab, wenn kein Empfänger da ist', () => {
    // Das Binding verlangt mindestens ein Ziel. Ohne diese Prüfung käme der
    // Fehler erst von Cloudflare, ohne Bezug zum Auslöser.
    expect(() => alsNachricht({ subject: 'x' })).toThrow('E-Mail ohne Empfänger')
  })

  it('reicht Text und HTML durch, aber keine Streams', () => {
    // Nodemailer erlaubt in `text`/`html` auch Buffer und Streams. Das Binding
    // nicht — die kämen als leeres Feld oder als «[object Object]» an.
    const n = alsNachricht({
      to: 'a@titz.cooking',
      subject: 'x',
      text: 'nur Text',
      html: '<p>und HTML</p>',
    })
    expect(n.text).toBe('nur Text')
    expect(n.html).toBe('<p>und HTML</p>')

    const mitStream = alsNachricht({
      to: 'a@titz.cooking',
      subject: 'x',
      text: Buffer.from('binär'),
    })
    expect(mitStream.text).toBeUndefined()
  })

  it('lässt leere Felder weg, statt sie leer zu setzen', () => {
    const n = alsNachricht({ to: 'a@titz.cooking', subject: 'x' })
    expect(n.cc).toBeUndefined()
    expect(n.bcc).toBeUndefined()
    expect(n.replyTo).toBeUndefined()
  })
})
