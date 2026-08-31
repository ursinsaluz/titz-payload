#!/usr/bin/env bash
# Prüft, dass keine Zugangsdaten ins öffentliche Repo wandern.
#
# GitHub hat für dieses Repo Secret Scanning und Push Protection aktiv — das ist
# die eigentliche Absicherung, greift aber erst beim Push und kennt in der
# Standardeinstellung nur Muster bekannter Anbieter. Ein PAYLOAD_SECRET ist
# einfach 64 Zeichen Hex und fällt darum durch. Dieses Skript schliesst die
# Lücke und meldet den Fund, bevor der Commit entsteht.
#
#   scripts/secret-scan.sh            # ganzer Arbeitsbaum (verfolgte Dateien)
#   scripts/secret-scan.sh --staged   # nur was zum Commit vorgemerkt ist
#
# Findet es `gitleaks` im PATH, läuft das zusätzlich (brew install gitleaks).
set -uo pipefail

cd "$(dirname "$0")/.." || exit 1

STAGED=0
[[ "${1:-}" == "--staged" ]] && STAGED=1

gefunden=0
melde() {
  echo "‼️  $1" >&2
  gefunden=1
}

# --- 1. Dateien, die per se nicht ins Repo gehören ---------------------------
# `.env.example` ist ausdrücklich erlaubt: Sie dokumentiert die Namen, nicht die
# Werte.
VERBOTEN='(^|/)\.env($|\.[^e]|\.e[^x])|\.dev\.vars|\.pem$|\.p12$|\.pfx$|\.key$|(^|/)id_rsa|(^|/)credentials'

if [[ $STAGED -eq 1 ]]; then
  dateien=$(git diff --cached --name-only --diff-filter=ACM)
else
  dateien=$(git ls-files)
fi

while IFS= read -r datei; do
  [[ -z "$datei" ]] && continue
  if [[ "$datei" =~ \.env\.example$ ]]; then continue; fi
  if echo "$datei" | grep -qE "$VERBOTEN"; then
    melde "Datei gehört nicht ins Repo: $datei"
  fi
done <<<"$dateien"

# --- 2. Bekannte Token-Formate ----------------------------------------------
ANBIETER='(sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{30,}|gho_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|AIza[0-9A-Za-z_-]{35})'

# --- 3. Generische Zuweisungen mit echtem Literal ---------------------------
# Ausgenommen: Zugriffe auf die Umgebung, Platzhalter und Beispieldateien —
# `PAYLOAD_SECRET=` in einer .env.example ist der Sinn der Datei.
GENERISCH='(SECRET|TOKEN|API_?KEY|PASSWORD|PASSWD|PRIVATE_KEY)[A-Z_]*[[:space:]]*[:=][[:space:]]*.?[A-Za-z0-9+/_=-]{16,}'
HARMLOS='process\.env|import\.meta\.env|env\.[A-Z]|globalThis|\$\{|@example|<[A-Z_]+>|your-|example\.com|xxx|CHANGEME'

if [[ $STAGED -eq 1 ]]; then
  inhalt=$(git diff --cached --unified=0 -- $(printf '%s\n' "$dateien" | tr '\n' ' ') 2>/dev/null | grep '^+' || true)
else
  inhalt=$(git ls-files -z | xargs -0 grep -nIH '' 2>/dev/null || true)
fi

treffer=$(printf '%s\n' "$inhalt" |
  grep -aE "$ANBIETER" |
  grep -avE "$HARMLOS" |
  grep -av 'pnpm-lock.yaml' | head -20 || true)
[[ -n "$treffer" ]] && melde "Bekanntes Token-Format gefunden:"$'\n'"$treffer"

treffer=$(printf '%s\n' "$inhalt" |
  grep -aE "$GENERISCH" |
  grep -avE "$HARMLOS" |
  grep -avE 'pnpm-lock.yaml|\.env\.example|cloudflare-env\.d\.ts' | head -20 || true)
[[ -n "$treffer" ]] && melde "Zuweisung mit langem Literal — Zugangsdaten?"$'\n'"$treffer"

# --- 4. gitleaks, falls vorhanden -------------------------------------------
if command -v gitleaks >/dev/null 2>&1; then
  if [[ $STAGED -eq 1 ]]; then
    gitleaks protect --staged --no-banner --redact || gefunden=1
  else
    gitleaks detect --no-banner --redact || gefunden=1
  fi
else
  echo "ℹ️  gitleaks nicht installiert — nur die eigenen Muster geprüft." >&2
  echo "   Vollständiger: brew install gitleaks" >&2
fi

if [[ $gefunden -eq 1 ]]; then
  cat >&2 <<'ENDE'

Abgebrochen. Das Repo ist öffentlich.

Falscher Alarm? Einmalig umgehen mit `git commit --no-verify` — und danach das
Muster in scripts/secret-scan.sh anpassen, damit es beim nächsten Mal nicht
wieder bremst.
ENDE
  exit 1
fi

echo "✓ Keine Zugangsdaten gefunden."
