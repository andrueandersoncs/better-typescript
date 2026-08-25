#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"
export GOWORK=off

tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/better-typescript-check.XXXXXX")"
cleanup() {
  rm -rf -- "$tmp_dir"
}
trap cleanup EXIT

printf 'format\n'
go_files=()
while IFS= read -r -d '' file; do
  if [[ -f "$file" ]]; then
    go_files+=("$file")
  fi
done < <(git ls-files -z --cached --others --exclude-standard -- '*.go')

if ((${#go_files[@]} > 0)); then
  mise exec go@1.26 -- gofmt -l "${go_files[@]}" >"$tmp_dir/unformatted"
fi
if [[ -s "$tmp_dir/unformatted" ]]; then
  printf 'Go files need formatting:\n' >&2
  cat "$tmp_dir/unformatted" >&2
  exit 1
fi

printf 'tidy\n'
mise exec go@1.26 -- go mod tidy -diff

printf 'npm install\n'
bun install --frozen-lockfile --ignore-scripts

printf 'compiler provenance\n'
mise exec go@1.26 -- go run ./scripts/compiler-provenance.go check

printf 'vet\n'
mise exec go@1.26 -- go vet ./...

printf 'test\n'
if ! mise exec go@1.26 -- go test ./... >"$tmp_dir/test.log" 2>&1; then
  cat "$tmp_dir/test.log" >&2
  exit 1
fi

printf 'build\n'
mise exec go@1.26 -- go build -o "$tmp_dir/better-typescript" ./cmd/better-typescript

printf 'vulnerabilities\n'
mise exec go@1.26 -- go tool govulncheck ./...
