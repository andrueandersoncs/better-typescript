#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$repo_root/toolchain.env"
cd "$repo_root"
git submodule update --init typescript-go

if ! git -C typescript-go merge-base --is-ancestor "$TYPESCRIPT_GO_REVISION" HEAD; then
  echo "typescript-go is not based on the pinned revision." >&2
  exit 1
fi

for patch in patches/*.patch; do
  if git -C typescript-go apply --reverse --check "$repo_root/$patch" >/dev/null 2>&1; then
    continue
  fi
  git -C typescript-go am --3way --no-gpg-sign "$repo_root/$patch"
done

mkdir -p internal/collections
find typescript-go/internal/collections -type f ! -name '*_test.go' -exec cp {} internal/collections/ \;
