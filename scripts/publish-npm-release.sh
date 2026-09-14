#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

version="${1:-}"
version_pattern='^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$'
if [[ $# -gt 1 ]]; then
  printf 'usage: %s [version]\n' "$0" >&2
  exit 2
fi
if [[ -z "$version" ]]; then
  current="$(npm view @better-typescript/better-typescript version)"
  if [[ ! "$current" =~ $version_pattern ]]; then
    printf 'published package has invalid version: %s\n' "$current" >&2
    exit 1
  fi
  patch=$((10#${BASH_REMATCH[3]} + 1))
  version="${BASH_REMATCH[1]}.${BASH_REMATCH[2]}.$patch"
elif [[ ! "$version" =~ $version_pattern ]]; then
  printf 'usage: %s [version]\n' "$0" >&2
  exit 2
fi
printf 'release version %s\n' "$version"
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
