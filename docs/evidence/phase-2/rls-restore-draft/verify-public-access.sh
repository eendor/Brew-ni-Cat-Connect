#!/usr/bin/env bash
# Count-only public access check. Requires NEXT_PUBLIC_SUPABASE_URL and
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in the environment. Prints no secrets.
set -euo pipefail

: "${NEXT_PUBLIC_SUPABASE_URL:?}"
: "${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:?}"

URL="${NEXT_PUBLIC_SUPABASE_URL%/}"
KEY="$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"

probe() {
  local table="$1"
  local expect="$2"
  local headers body code total
  headers="$(mktemp)"
  body="$(mktemp)"
  code="$(curl -sS -D "$headers" -o "$body" -w '%{http_code}' \
    -H "apikey: ${KEY}" \
    -H "Authorization: Bearer ${KEY}" \
    -H "Prefer: count=exact" \
    -H "Range: 0-0" \
    -H "Accept: application/json" \
    "${URL}/rest/v1/${table}?select=id" || true)"
  total="$(awk -F'/' 'BEGIN{IGNORECASE=1} /^content-range:/ {gsub(/\r/,"",$2); print $2; exit}' "$headers")"
  echo "table=${table} http=${code} total=${total:-?} expect=${expect}"
  rm -f "$headers" "$body"
}

echo "host=$(printf '%s' "$URL" | sed -E 's#https?://([^/]+).*#\1#')"
probe categories allow
probe items allow
probe inventory deny
probe recipe_mappings deny
probe expenses deny
probe orders deny
probe order_items deny
probe app_release deny
