# CLAUDE.md

Die verbindlichen Anweisungen stehen in **[AGENTS.md](AGENTS.md)** — Sprache,
die sieben Fallen des Projekts, Typen, Tests, Stil, Deployen. Diese Datei
ergänzt nur, was Claude Code betrifft.

## Vor dem Anfangen

`pnpm install` einmal ausführen. Es setzt über das `prepare`-Skript
`core.hooksPath` auf `.githooks`, damit der Secret-Scan als pre-commit-Hook
greift. Das Repo ist öffentlich.

## Der MCP-Server

`.mcp.json` registriert das CMS unter `http://localhost:3000/api/mcp`. Damit
liest und schreibt Claude Code den Inhalt direkt, ohne den Umweg über die
REST-API von Hand. Zwei Voraussetzungen:

1. `pnpm dev:cms` läuft.
2. `PAYLOAD_MCP_TOKEN` steht in `apps/cms/.env` — ein Schlüssel aus dem Admin
   unter **System → MCP-Schlüssel**.

Fehlt eines von beiden, ist der Server schlicht nicht verbunden. Das ist kein
Fehler, nur eine fehlende Fähigkeit.

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
