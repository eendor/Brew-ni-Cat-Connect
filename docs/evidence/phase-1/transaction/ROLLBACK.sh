#!/usr/bin/env bash
set -euo pipefail
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
target="${1:-$script_dir/MODIFIED_FILE}"
repo_root="$(git -C "$script_dir" rev-parse --show-toplevel)"
git -C "$repo_root" show main:.gitignore > "$target"
actual_hash="$(sha256sum "$target" | awk '{print $1}')"
expected_hash="e8a08878180212d997c45f2bd2cdfb42f14107950be81bc6193bf37957b9f937"
if [[ "$actual_hash" != "$expected_hash" ]]; then
  printf 'ROLLBACK: hash mismatch expected=%s actual=%s\n' "$expected_hash" "$actual_hash" >&2
  exit 1
fi
printf 'ROLLBACK: restored main:.gitignore fixture\n'
printf 'SHA256: %s\n' "$actual_hash"
