#!/usr/bin/env bash
set -euo pipefail

archive="${1:-}"
if [[ $# -ne 1 || ! -f "$archive" || "$archive" != *.tgz ]]; then
  printf 'usage: %s <package.tgz>\n' "$0" >&2
  exit 2
fi

metadata="$(tar -xOzf "$archive" package/package.json)"
name="$(printf '%s' "$metadata" | node -e 'const fs = require("node:fs"); process.stdout.write(JSON.parse(fs.readFileSync(0, "utf8")).name)')"
version="$(printf '%s' "$metadata" | node -e 'const fs = require("node:fs"); process.stdout.write(JSON.parse(fs.readFileSync(0, "utf8")).version)')"
local_integrity="$(node -e 'const fs = require("node:fs"); const crypto = require("node:crypto"); const value = crypto.createHash("sha512").update(fs.readFileSync(process.argv[1])).digest("base64"); process.stdout.write(`sha512-${value}`)' "$archive")"

error_log="$(mktemp "${TMPDIR:-/tmp}/better-typescript-npm-view.XXXXXX")"
cleanup() {
  rm -f -- "$error_log"
}
trap cleanup EXIT

if remote_integrity="$(npm view "$name@$version" dist.integrity 2>"$error_log")"; then
  if [[ "$remote_integrity" != "$local_integrity" ]]; then
    printf '%s@%s already exists with different contents.\n' "$name" "$version" >&2
    exit 1
  fi
  printf '%s@%s is already published with matching contents.\n' "$name" "$version"
  exit 0
fi
if ! grep -q 'E404' "$error_log"; then
  cat "$error_log" >&2
  exit 1
fi

# Never publish a launcher before the platform packages it depends on are installable.
dependencies="$(printf '%s' "$metadata" | node -e 'const fs = require("node:fs"); const deps = JSON.parse(fs.readFileSync(0, "utf8")).optionalDependencies ?? {}; process.stdout.write(Object.entries(deps).map(([name, version]) => `${name}@${version}`).join("\n"))')"
wait_seconds="${BETTER_TYPESCRIPT_NPM_WAIT_SECONDS:-300}"
for dependency in $dependencies; do
  waited=0
  until npm view "$dependency" version >/dev/null 2>&1; do
    if ((waited >= wait_seconds)); then
      printf 'refusing to publish %s@%s: %s is not on the registry.\n' "$name" "$version" "$dependency" >&2
      exit 1
    fi
    sleep 10
    waited=$((waited + 10))
  done
done

npm publish "$archive" --access public
