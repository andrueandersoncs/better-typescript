# Effect snapshot

`repos/effect` is a read-only reference snapshot of
[Effect](https://github.com/Effect-TS/effect). It is not a build or runtime dependency.
Rule research starts with its AI documentation and can use related source, package docs, and tests as
evidence.

## Provenance and license

The snapshot is Effect package version `4.0.0-rc.111` at upstream commit
`648f566dd259898e7697c7fcb796183ccbc474ab`. Its upstream MIT license is included at
`repos/effect/LICENSE`.

The full snapshot is retained for now because rule research follows links across AI docs,
implementation, package docs, and tests. There is not yet a proven stable list of files that contains
all needed rule evidence. Narrow it only after that evidence boundary is recorded.

## Manual update

Git history records the first import as a squashed subtree merge in `1c24ffb5d`, followed by full-tree
syncs in `0145ad582` and `1b73aab30`. The latest sync commit records the upstream revision in its
message. Continue that method:

1. Choose an upstream package version and full commit hash.
2. From a clean worktree, verify the commit and package version, then replace the snapshot with a
   Git archive:

   ```sh
   package_version=4.0.0-rc.111
   revision=648f566dd259898e7697c7fcb796183ccbc474ab
   tmp=$(mktemp -d)
   git clone --no-tags https://github.com/Effect-TS/effect.git "$tmp/effect"
   test "$(git -C "$tmp/effect" rev-parse --verify "$revision^{commit}")" = "$revision"
   git -C "$tmp/effect" show "$revision:packages/effect/package.json" > "$tmp/package.json"
   actual_version=$(sed -n 's/^[[:space:]]*"version":[[:space:]]*"\([^"]*\)".*/\1/p' "$tmp/package.json")
   test "$actual_version" = "$package_version"
   rm -rf repos/effect
   mkdir -p repos/effect
   git -C "$tmp/effect" archive "$revision" | tar -x -C repos/effect
   rm -rf "$tmp"
   ```

3. Update the package version and hash in this file and `THIRD-PARTY-NOTICES.md`. Confirm that
   `repos/effect/LICENSE` remains present.
4. Review `git diff --stat` and the rule evidence paths. Then record the source like the existing
   history:

   ```sh
   git add repos/effect docs/effect-snapshot.md THIRD-PARTY-NOTICES.md
   git commit -m "chore: update vendored Effect to $package_version" \
     -m "Sync repos/effect to Effect-TS/effect at $revision."
   ```
