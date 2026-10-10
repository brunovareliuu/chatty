#!/bin/sh
# Empaqueta Chatty como skill (SKILL.md en la raíz y la app al lado) para marketplaces como Agensi.
# Uso: sh skill/pack.sh [salida.zip]. Por omisión: dist/chatty-skill.zip.
# Empaqueta lo que está en el último commit (HEAD) más skill/SKILL.md; deja fuera .github.
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$DIR/dist/chatty-skill.zip}"
case "$OUT" in /*) ;; *) OUT="$PWD/$OUT" ;; esac

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

(cd "$DIR" && git archive HEAD -- . ':!.github' ':!skill') | tar -x -C "$STAGE"
cp "$DIR/skill/SKILL.md" "$STAGE/SKILL.md"

mkdir -p "$(dirname "$OUT")"
rm -f "$OUT"
(cd "$STAGE" && zip -rqX "$OUT" . -x '.DS_Store')
echo "chatty skill → $OUT"
