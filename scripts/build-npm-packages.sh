#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"
export GOWORK=off

version="${1:-}"
output="${2:-dist/npm}"
if [[ ! "$version" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$ ]]; then
  printf 'usage: %s <version> [output-directory]\n' "$0" >&2
  exit 2
fi
if [[ -z "$output" || "$output" == "/" || "$output" == "." ]]; then
  printf 'refusing unsafe output directory: %q\n' "$output" >&2
  exit 2
fi

packages=(
  better-typescript
  better-typescript-darwin-amd64
  better-typescript-darwin-arm64
  better-typescript-linux-amd64
  better-typescript-linux-arm64
)
stage_marker=.better-typescript-npm-stage
if [[ -e "$output" || -L "$output" ]]; then
  if [[ -L "$output" || ! -d "$output" || ! -f "$output/$stage_marker" ]]; then
    printf 'refusing to replace unowned output directory: %s\n' "$output" >&2
    exit 2
  fi
  rm -rf -- "$output"
fi
mkdir -p "$output"
touch "$output/$stage_marker"
for package in "${packages[@]}"; do
  destination="$output/$package"
  mkdir -p "$destination"
  cp "npm/$package/package.json" "$destination/package.json"
  cp LICENSE "$destination/LICENSE"
  if [[ "$package" == "better-typescript" ]]; then
    cp -R npm/better-typescript/bin "$destination/bin"
    cp npm/better-typescript/README.md "$destination/README.md"
  else
    mkdir -p "$destination/bin" "$destination/LICENSES"
    cp npm/README.platform.md "$destination/README.md"
    cp THIRD-PARTY-NOTICES.md "$destination/THIRD-PARTY-NOTICES.md"
    cp LICENSES/tsgolint-LICENSE "$destination/LICENSES/tsgolint-LICENSE"
    cp LICENSES/typescript-go-LICENSE "$destination/LICENSES/typescript-go-LICENSE"
    cp LICENSES/typescript-go-NOTICE.txt "$destination/LICENSES/typescript-go-NOTICE.txt"
  fi
done

for manifest in "$output"/*/package.json; do
  bun -e '
    const path = Bun.argv[1];
    const version = Bun.argv[2];
    const manifest = await Bun.file(path).json();
    manifest.version = version;
    delete manifest.private;
    if (manifest.optionalDependencies !== undefined) {
      for (const name of Object.keys(manifest.optionalDependencies)) {
        manifest.optionalDependencies[name] = version;
      }
    }
    await Bun.write(path, JSON.stringify(manifest, null, 2) + "\n");
  ' "$manifest" "$version"
done

if command -v mise >/dev/null 2>&1; then
  go_command=(mise exec go@1.26 -- go)
elif command -v go >/dev/null 2>&1; then
  go_command=(go)
else
  printf 'Go 1.26 is required.\n' >&2
  exit 1
fi
if [[ "$("${go_command[@]}" env GOVERSION)" != go1.26.* ]]; then
  printf 'Go 1.26 is required.\n' >&2
  exit 1
fi

build() {
  local goos="$1"
  local goarch="$2"
  local package="$3"
  printf 'build %s/%s\n' "$goos" "$goarch"
  CGO_ENABLED=0 GOOS="$goos" GOARCH="$goarch" \
    "${go_command[@]}" build -trimpath -ldflags='-s -w' \
    -o "$output/$package/bin/better-typescript" ./cmd/better-typescript
  chmod 0755 "$output/$package/bin/better-typescript"
}

build darwin amd64 better-typescript-darwin-amd64
build darwin arm64 better-typescript-darwin-arm64
build linux amd64 better-typescript-linux-amd64
build linux arm64 better-typescript-linux-arm64
chmod 0755 "$output/better-typescript/bin/better-typescript.js"

write_dependency_notice() {
  local package="$1"
  local binary="$output/$package/bin/better-typescript"
  local notice="$output/$package/BINARY-DEPENDENCIES.txt"
  local kind module version license source
  printf 'Binary Go module dependencies\n\nThe typescript-go notice is retained verbatim. These are the versions selected in this binary.\n\n' >"$notice"
  while read -r kind module version _; do
    [[ "$kind" == dep ]] || continue
    case "$module" in
      github.com/andrueandersoncs/typescript-go)
        license=typescript-go-LICENSE
        source=LICENSES/typescript-go-LICENSE
        ;;
      github.com/go-json-experiment/json)
        license=go-json-experiment-LICENSE
        source="$("${go_command[@]}" list -m -f '{{.Dir}}' "$module@$version")/LICENSE"
        ;;
      github.com/klauspost/cpuid/v2)
        license=cpuid-LICENSE
        source="$("${go_command[@]}" list -m -f '{{.Dir}}' "$module@$version")/LICENSE"
        ;;
      github.com/zeebo/xxh3)
        license=xxh3-LICENSE
        source="$("${go_command[@]}" list -m -f '{{.Dir}}' "$module@$version")/LICENSE"
        ;;
      golang.org/x/sync)
        license=golang-x-sync-LICENSE
        source="$("${go_command[@]}" list -m -f '{{.Dir}}' "$module@$version")/LICENSE"
        ;;
      golang.org/x/sys)
        license=golang-x-sys-LICENSE
        source="$("${go_command[@]}" list -m -f '{{.Dir}}' "$module@$version")/LICENSE"
        ;;
      golang.org/x/text)
        license=golang-x-text-LICENSE
        source="$("${go_command[@]}" list -m -f '{{.Dir}}' "$module@$version")/LICENSE"
        ;;
      *)
        printf 'missing license mapping for %s@%s\n' "$module" "$version" >&2
        exit 1
        ;;
    esac
    test -f "$source"
    printf -- '- %s@%s: LICENSES/%s\n' "$module" "$version" "$license" >>"$notice"
    cp "$source" "$output/$package/LICENSES/$license"
  done < <("${go_command[@]}" version -m "$binary")
}

for package in "${packages[@]:1}"; do
  write_dependency_notice "$package"
done
