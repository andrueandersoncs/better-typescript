#!/usr/bin/env bash
set -euo pipefail

prototype_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$prototype_dir/../.." && pwd)"
work_dir="$repo_root/.cache/tsgolint-no-error-type-run"
commit="5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6"

rm -rf "$work_dir"
git clone --quiet https://github.com/oxc-project/tsgolint.git "$work_dir"
cd "$work_dir"
git checkout --quiet "$commit"
git submodule update --init

pushd typescript-go >/dev/null
git am --3way --no-gpg-sign ../patches/*.patch
popd >/dev/null

mkdir -p internal/collections
find ./typescript-go/internal/collections -type f ! -name '*_test.go' -exec cp {} internal/collections/ \;
pnpm install --frozen-lockfile
git apply "$prototype_dir/tsgolint-no-error-type.patch"

mise exec go@1.26 -- go test ./internal/rules/no_error_type
mise exec go@1.26 -- go test ./internal/...
mise exec go@1.26 -- go test ./cmd/tsgolint \
  -run '^$' \
  -bench '^(BenchmarkTypeReferenceTraversal|BenchmarkNoErrorType)' \
  -benchmem \
  -benchtime=1s \
  -count=5
mise exec go@1.26 -- go build -o tsgolint-prototype ./cmd/tsgolint
"$prototype_dir/benchmark-process.py" ./tsgolint-prototype ./e2e/fixtures/basic

cp -R "$prototype_dir/fixture" prototype-fixture
./tsgolint-prototype --tsconfig prototype-fixture/tsconfig.json || true
