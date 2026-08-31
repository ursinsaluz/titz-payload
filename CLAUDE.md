# CLAUDE.md

Die verbindlichen Anweisungen stehen in **[AGENTS.md](AGENTS.md)** — Sprache,
die sieben Fallen des Projekts, Typen, Tests, Stil, Deployen. Diese Datei
ergänzt nur, was Claude Code betrifft.

## Vor dem Anfangen

`pnpm install` einmal ausführen. Es setzt über das `prepare`-Skript
`core.hooksPath` auf `.githooks`, damit der Secret-Scan als pre-commit-Hook
greift. Das Repo ist öffentlich.

## Der MCP-Server

`.mcp.json` registriert zwei Server: `payload` gegen den lokalen Dev-Server und
`payload-prod` gegen admin.titz.cooking. Damit liest und schreibt Claude Code
den Inhalt direkt, ohne den Umweg über die REST-API von Hand.

Die Tokens kommen aus der **Umgebung** — `.mcp.json` expandiert `${…}` aus den
Umgebungsvariablen der Sitzung, nicht aus `apps/cms/.env`. Siehe
[README.md](README.md#mcp).

Für `payload` muss zusätzlich `pnpm dev:cms` laufen. Fehlt Token oder Server,
ist der Eintrag schlicht nicht verbunden — kein Fehler, nur eine fehlende
Fähigkeit.

**`payload-prod` schreibt in den Live-Inhalt.** Eine Änderung darüber löst den
Rebuild-Hook aus und landet auf titz.cooking. Zum Nachsehen den lokalen Server
nehmen; `payload-prod` nur, wenn genau das gewollt ist.

## Was beim Prüfen wirklich hilft

`pnpm verify` ist die ganze Kette und dauert etwa zwei Minuten. Für schnelle
Runden:

```bash
pnpm check                          # Typen, ~15 s — fängt das meiste
pnpm --filter @titz/cms test        # Unit-Tests, < 1 s
```

Der Web-Build braucht erreichbaren Content. Ohne laufendes CMS:
`PAYLOAD_URL=https://admin.titz.cooking pnpm --filter @titz/web build`.

## Visuelles nachsehen

Für einen Blick auf die gebaute Seite die Konfiguration `web-preview` aus
`.claude/launch.json` starten (Port 4400) — die liefert `dist/` aus, also genau
das, was auch bei Cloudflare landet. `web` (Port 4321) ist der Dev-Server und
braucht das CMS daneben.

Astro legt `preview` ab Version 7 selbst in den Hintergrund; `astro preview
stop` beendet ihn.
