#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"
stage="${1:-dist/npm}"
output="${2:-$stage/tarballs}"
stage="$(cd -- "$stage" && pwd)"
packages=(
  better-typescript
  better-typescript-darwin-amd64
  better-typescript-darwin-arm64
  better-typescript-linux-amd64
  better-typescript-linux-arm64
)

archive_marker=.better-typescript-npm-archives
if [[ -e "$output" || -L "$output" ]]; then
  if [[ -L "$output" || ! -d "$output" || ! -f "$output/$archive_marker" ]]; then
    printf 'refusing to replace unowned output directory: %s\n' "$output" >&2
    exit 2
  fi
  rm -rf -- "$output"
fi
mkdir -p "$output"
touch "$output/$archive_marker"
output="$(cd -- "$output" && pwd)"
for package in "${packages[@]}"; do
  test -f "$stage/$package/package.json"
  (
    cd "$stage/$package"
    bun pm pack --ignore-scripts --destination "$output"
  )
done
