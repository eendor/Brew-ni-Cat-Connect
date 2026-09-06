#!/usr/bin/env bash
set -euo pipefail
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
target="${1:-$script_dir/MODIFIED_FILE}"
repo_root="$(git -C "$script_dir" rev-parse --show-toplevel)"
git -C "$repo_root" show 1781201:src/components/menu/menu-item-card.tsx > "$target"
actual_hash="$(sha256sum < "$target" | awk '{print $1}')"
expected_hash="377263050579a41d70b0c6eb60acde898f5269227382db7226fda6ac5870949f"
if [[ "$actual_hash" != "$expected_hash" ]]; then
  printf 'ROLLBACK: hash mismatch expected=%s actual=%s\n' "$expected_hash" "$actual_hash" >&2
  exit 1
fi
printf 'ROLLBACK: restored pre-follow-up MenuItemCard fixture\n'
printf 'SHA256: %s\n' "$actual_hash"
