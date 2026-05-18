#!/bin/sh
#
# Render runtime config into /usr/share/nginx/html/config.js so the SPA can
# read it via window.__APP_CONFIG__ without a rebuild.
#
# The nginx:alpine image runs every executable in /docker-entrypoint.d/ at
# container start (alphabetical order), so this file is picked up
# automatically once it's chmod +x.
#
set -eu

CONFIG_JS="/usr/share/nginx/html/config.js"

# Read from VITE_-prefixed vars so users can copy the same names from their
# local .env straight into the platform (Koyeb / Render / Fly / …).
firebase_key="${VITE_FIREBASE_KEY:-}"
client_type="${VITE_CLIENT_TYPE:-CLIENT_TYPE_WEB}"
stats_prefix="${VITE_STATS_PATH_PREFIX:-/api/v1/stats}"

# Escape `</` so an embedded value can't break out of the <script> tag, and
# escape backslashes / double-quotes so the JSON-ish output stays valid.
escape() {
    printf '%s' "$1" | sed \
        -e 's/\\/\\\\/g' \
        -e 's/"/\\"/g' \
        -e 's|</|<\\/|g'
}

cat > "$CONFIG_JS" <<EOF
window.__APP_CONFIG__ = Object.freeze({
  firebaseKey: "$(escape "$firebase_key")",
  clientType: "$(escape "$client_type")",
  statsPathPrefix: "$(escape "$stats_prefix")"
});
EOF

# Log redacted summary so the user can tell whether values were picked up,
# without leaking secrets into the platform logs.
if [ -n "$firebase_key" ]; then
    masked="$(printf '%s' "$firebase_key" | head -c 4)***$(printf '%s' "$firebase_key" | tail -c 4)"
else
    masked="(empty)"
fi
echo "[config.js] firebaseKey=${masked} clientType=${client_type} statsPathPrefix=${stats_prefix}"
