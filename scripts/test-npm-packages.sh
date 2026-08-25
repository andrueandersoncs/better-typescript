#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"
archives="${1:-dist/npm/tarballs}"
project="${2:-npm/testdata/project}"
archives="$(cd -- "$archives" && pwd)"
project="$(cd -- "$project" && pwd)"

case "$(uname -s)/$(uname -m)" in
  Darwin/arm64) platform=darwin-arm64 ;;
  Darwin/x86_64) platform=darwin-amd64 ;;
  Linux/aarch64 | Linux/arm64) platform=linux-arm64 ;;
  Linux/x86_64) platform=linux-amd64 ;;
  *) printf 'unsupported test platform: %s/%s\n' "$(uname -s)" "$(uname -m)" >&2; exit 1 ;;
esac

launcher=("$archives"/andrueandersoncs-better-typescript-[0-9]*.tgz)
native=("$archives"/andrueandersoncs-better-typescript-"$platform"-*.tgz)
if [[ ${#launcher[@]} -ne 1 || ! -f "${launcher[0]}" || ${#native[@]} -ne 1 || ! -f "${native[0]}" ]]; then
  printf 'expected one launcher and one %s archive in %s\n' "$platform" "$archives" >&2
  exit 1
fi

temporary="$(mktemp -d "${TMPDIR:-/tmp}/better-typescript-npm.XXXXXX")"
cleanup() {
  rm -rf -- "$temporary"
}
trap cleanup EXIT
cp -R "$project"/. "$temporary"/
(
  cd "$temporary"
  npm install --offline --ignore-scripts --no-audit --no-fund --package-lock=false \
    "${launcher[0]}" "${native[0]}"
  node_modules/.bin/better-typescript >results.ndjson
  grep -F '"ruleName":"no-throw"' results.ndjson >/dev/null
)
