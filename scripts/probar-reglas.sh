#!/bin/bash
# Prueba de humo de firestore.rules contra el emulador: sin sesión no se ve
# nada, una cuenta de Firebase que el panel no dio de alta tampoco, y quien sí
# está dado de alta solo edita lo que le toca. Los tokens de Meta, nunca.
#
# Requiere Java (el emulador de Firestore corre en la JVM). Desde la raíz:
#   firebase emulators:exec --only firestore --project demo-chatty ./scripts/probar-reglas.sh
#
# `demo-chatty` es un proyecto de demostración: el emulador no toca nada real.

B="http://127.0.0.1:8080/v1/projects/demo-chatty/databases/(default)/documents"
ADMIN=(-H "Authorization: Bearer owner")   # el emulador se salta las reglas con este token

# El emulador acepta tokens sin firmar: así se simula a alguien con sesión.
token() {
  local b64=$(printf '{"alg":"none","typ":"JWT"}' | base64 | tr '+/' '-_' | tr -d '=\n')
  local ahora=$(date +%s)
  local datos=$(printf '{"iss":"https://securetoken.google.com/demo-chatty","aud":"demo-chatty","auth_time":%s,"user_id":"%s","sub":"%s","iat":%s,"exp":%s,"firebase":{"sign_in_provider":"password"}}' "$ahora" "$1" "$1" "$ahora" $((ahora + 3600)) | base64 | tr '+/' '-_' | tr -d '=\n')
  echo "$b64.$datos."
}
MIEMBRO=(-H "Authorization: Bearer $(token miembro)")
EXTRANO=(-H "Authorization: Bearer $(token extrano)")

code() { curl -s -o /dev/null -w "%{http_code}" "$@"; }
seed() { curl -s -o /dev/null "${ADMIN[@]}" -X PATCH -H "Content-Type: application/json" "$B/$1" -d "$2"; }
FALLAS=0
check() { local nombre="$1" esperado="$2" real="$3"; if [ "$real" = "$esperado" ]; then echo "OK    $nombre ($real)"; else echo "FALLA $nombre: esperaba $esperado, dio $real"; FALLAS=$((FALLAS + 1)); fi; }

seed "users/miembro" '{"fields":{"email":{"stringValue":"ana@correo.com"},"role":{"stringValue":"owner"}}}'
seed "accounts/123" '{"fields":{"username":{"stringValue":"mimarca"}}}'
seed "accounts/123/private/credentials" '{"fields":{"token":{"stringValue":"cifrado"}}}'
seed "accounts/123/contacts/c1" '{"fields":{"username":{"stringValue":"lucia"},"tags":{"arrayValue":{}}}}'
seed "accounts/123/conversations/c1/messages/m1" '{"fields":{"text":{"stringValue":"hola"}}}'
seed "config/push" '{"fields":{"publica":{"stringValue":"x"}}}'

check "leer una cuenta sin sesión" 403 "$(code "$B/accounts/123")"
check "leer una cuenta con Firebase pero sin alta en users" 403 "$(code "${EXTRANO[@]}" "$B/accounts/123")"
check "leer una cuenta dado de alta" 200 "$(code "${MIEMBRO[@]}" "$B/accounts/123")"
check "leer el token de Meta dado de alta" 403 "$(code "${MIEMBRO[@]}" "$B/accounts/123/private/credentials")"
check "cambiar la cuenta desde el navegador" 403 "$(code "${MIEMBRO[@]}" -X PATCH -H 'Content-Type: application/json' "$B/accounts/123?updateMask.fieldPaths=username" -d '{"fields":{"username":{"stringValue":"otra"}}}')"
check "ponerle etiquetas a un contacto" 200 "$(code "${MIEMBRO[@]}" -X PATCH -H 'Content-Type: application/json' "$B/accounts/123/contacts/c1?updateMask.fieldPaths=tags" -d '{"fields":{"tags":{"arrayValue":{"values":[{"stringValue":"vip"}]}}}}')"
check "cambiarle el usuario a un contacto" 403 "$(code "${MIEMBRO[@]}" -X PATCH -H 'Content-Type: application/json' "$B/accounts/123/contacts/c1?updateMask.fieldPaths=username" -d '{"fields":{"username":{"stringValue":"otro"}}}')"
check "leer mensajes dado de alta" 200 "$(code "${MIEMBRO[@]}" "$B/accounts/123/conversations/c1/messages/m1")"
check "escribir un mensaje desde el navegador" 403 "$(code "${MIEMBRO[@]}" -X PATCH -H 'Content-Type: application/json' "$B/accounts/123/conversations/c1/messages/m2" -d '{"fields":{"text":{"stringValue":"spam"}}}')"
check "crear una automatización dado de alta" 200 "$(code "${MIEMBRO[@]}" -X PATCH -H 'Content-Type: application/json' "$B/accounts/123/automations/a1" -d '{"fields":{"name":{"stringValue":"GUÍA"}}}')"
check "crear una automatización sin alta" 403 "$(code "${EXTRANO[@]}" -X PATCH -H 'Content-Type: application/json' "$B/accounts/123/automations/a2" -d '{"fields":{"name":{"stringValue":"x"}}}')"
check "darse de alta solo en users" 403 "$(code "${EXTRANO[@]}" -X PATCH -H 'Content-Type: application/json' "$B/users/extrano" -d '{"fields":{"email":{"stringValue":"x@correo.com"}}}')"
check "leer la configuración del servidor" 403 "$(code "${MIEMBRO[@]}" "$B/config/push")"

[ "$FALLAS" -eq 0 ] || { echo "$FALLAS prueba(s) fallaron"; exit 1; }
echo "Todas las pruebas de reglas pasaron."
