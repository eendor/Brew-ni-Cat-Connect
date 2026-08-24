#!/usr/bin/env bash
set -euo pipefail
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
target="${1:-$script_dir/MODIFIED_FILE}"
repo_root="$(git -C "$script_dir" rev-parse --show-toplevel)"
git -C "$repo_root" show main:src/components/layout/site-header.tsx > "$target"
actual_hash="$(sha256sum "$target" | awk '{print $1}')"
expected_hash="03324b1c258a671e92abf835c991566cb8e6b96c0b1783c38818b08c1a309701"
if [[ "$actual_hash" != "$expected_hash" ]]; then
  printf 'ROLLBACK: hash mismatch expected=%s actual=%s\n' "$expected_hash" "$actual_hash" >&2
  exit 1
fi
printf 'ROLLBACK: restored main header fixture\n'
printf 'SHA256: %s\n' "$actual_hash"
