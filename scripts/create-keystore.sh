#!/usr/bin/env bash
# Crea tu clave de firma (solo una vez) y muestra lo que hay que pegar en GitHub.
# Necesita Java instalado (keytool). Guarda diaadia.jks y la contraseña en un sitio seguro:
# si la pierdes, no podrás actualizar la app sin desinstalarla.
set -e
read -s -p "Elige una contraseña (mínimo 6 caracteres): " PASS; echo
keytool -genkeypair -v -keystore diaadia.jks -alias diaadia -keyalg RSA -keysize 2048 \
  -validity 10000 -storepass "$PASS" -keypass "$PASS" -dname "CN=Dia a Dia, O=Personal, C=ES"
echo
echo "Secreto ANDROID_KEYSTORE_BASE64 (cópialo entero):"
base64 -w 0 diaadia.jks 2>/dev/null || base64 diaadia.jks | tr -d '\n'
echo
echo
echo "Secreto ANDROID_KEYSTORE_PASSWORD: la contraseña que acabas de escribir"
