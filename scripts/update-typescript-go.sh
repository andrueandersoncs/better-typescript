#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || -z "$1" ]]; then
  printf 'usage: %s <version>\n' "$0" >&2
  exit 2
fi

version="$1"
module="github.com/andrueandersoncs/typescript-go"
repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"
export GOWORK=off
export GONOPROXY=
export GOPRIVATE=
export GOPROXY=https://proxy.golang.org

printf 'resolve %s@%s\n' "$module" "$version"
mise exec go@1.26 -- go list -m "$module@$version" >/dev/null

printf 'update %s@%s\n' "$module" "$version"
mise exec go@1.26 -- go get "$module@$version"
mise exec go@1.26 -- go mod tidy

printf 'update compiler provenance\n'
mise exec go@1.26 -- go run ./scripts/compiler-provenance.go update

"$repo_root/scripts/check.sh"
