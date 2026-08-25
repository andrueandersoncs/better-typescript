#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

version="${1:-}"
if [[ ! "$version" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$ ]]; then
  printf 'usage: %s <version>\n' "$0" >&2
  exit 2
fi
if [[ -n "$(git status --porcelain)" ]]; then
  printf 'npm release requires a clean Git worktree.\n' >&2
  exit 1
fi

npm whoami >/dev/null
stage="$repo_root/dist/npm"
archives="$stage/tarballs"

./scripts/build-npm-packages.sh "$version" "$stage"
BETTER_TYPESCRIPT_NPM_STAGE="$stage" ./scripts/check.sh
./scripts/pack-npm-packages.sh "$stage" "$archives"
./scripts/test-npm-packages.sh "$archives"

for archive in \
  "$archives"/better-typescript-better-typescript-darwin-amd64-*.tgz \
  "$archives"/better-typescript-better-typescript-darwin-arm64-*.tgz \
  "$archives"/better-typescript-better-typescript-linux-amd64-*.tgz \
  "$archives"/better-typescript-better-typescript-linux-arm64-*.tgz; do
  ./scripts/publish-npm-package.sh "$archive"
done
./scripts/publish-npm-package.sh "$archives"/better-typescript-better-typescript-[0-9]*.tgz
