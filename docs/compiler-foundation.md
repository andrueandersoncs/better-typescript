# Compiler foundation

Better TypeScript is one normal Go module. A clone gets all compiler support from a public Go dependency. The root `go.mod` is the full module definition. No compiler preparation step is required. Compiler source, generated adapters, and Better-specific compiler changes all live in that dependency.

## Pin and provenance

The retained compiler provenance is:

- Module: `github.com/andrueandersoncs/typescript-go`
- Version: `v0.1.0`
- Tag commit: `d124aa8a04310d6c057451daaf8490f4ceec92f2`
- Microsoft base commit: `2bd066d87f5bafd315be9f40889d0a60b9e58e0b`

The tag commit is one commit above the listed Microsoft base. The update script verifies this relation against both Git remotes.

The fork publishes 12 generated adapter packages: `ast`, `bundled`, `checker`, `compiler`, `core`, `parser`, `scanner`, `tsoptions`, `tspath`, `vfs`, `vfs/cachedvfs`, and `vfs/osvfs`.

From the fork root, this deterministic command regenerates them:

```sh
go run ./tools/gen_shims
```

The generator and initial adapters derive from tsgolint commit `7324ae6a96cacd6284a0d0fb7397073052005c0a`. See [`THIRD-PARTY-NOTICES.md`](../THIRD-PARTY-NOTICES.md) and the retained files in `LICENSES/`.

## Removal evidence

The audit used an isolated shim-consolidation prototype and the final public-module migration. The prototype proved that one shim module could replace 15 nested modules: `GOWORK=off go test ./...` passed for all 15 adapter packages, and root `go fmt`, `go vet`, and `go test ./...` passed. It still needed local `replace` directives, so it was not distributable. The selected design then passed this fresh-cache check with no workspace or local source:

```sh
tmp="$(mktemp -d)"
GOWORK=off GOMODCACHE="$tmp/mod" GOCACHE="$tmp/build"   GOPROXY=https://proxy.golang.org   mise exec go@1.26 -- go build -o "$tmp/better-typescript" ./cmd/better-typescript
```

| Removed item | Decision and reason | Supporting check |
| --- | --- | --- |
| Patch 0001, project-service checker count | Remove. The CLI no longer uses the project adapter or project service. Its direct compiler path controls workers. | Fresh-cache build and full rule tests passed on the unpatched Microsoft base. |
| Patch 0002, exported project internals | Remove. It existed only for the local `project` adapter. That adapter has no caller in the selected direct compiler path. | The prototype showed the adapter could consolidate; the fresh-cache build then passed with `project` absent. |
| Patch 0003, early invalid-tsconfig return | Remove. The CLI now handles config diagnostics through its direct program loader. | Invalid and missing `tsconfig.json` contract tests passed with the public unpatched base. |
| Patch 0004, public JSON in `OrderedMap` | Remove. It only made the copied collection usable outside the compiler's `internal` tree. The copied `OrderedMap` was removed. | Fresh-cache build and all tests passed without `internal/collections`. |
| Patch 0005, cached VFS reads | Remove. The cached-host linter path was dead and removed. The direct compiler host does not use this wrapper. | Full tests and build passed without `NewCachedFSCompilerHost` or the patch. |
| Required adapters | Move `ast`, `bundled`, `checker`, `compiler`, `core`, `parser`, `scanner`, `tsoptions`, `tspath`, `vfs`, `vfs/cachedvfs`, and `vfs/osvfs` into the public fork. | Fork adapter tests and deterministic generator check passed; fresh-cache build resolved only the public module. |
| Unused adapters | Remove `project`, `jsnum`, and `lsp/lsproto`. No production import needs them. | Repository import search was empty; fresh-cache build and full tests passed without them. |
| Copied collections | Remove `cow`, `multimap`, `ordered_map`, `ordered_set`, `set`, `syncmap`, and `syncset`. Replace the two live `SyncMap` uses with a small typed wrapper over `sync.Map`. | Fresh-cache build and full tests passed after deleting `internal/collections`. |
| Submodule and bootstrap | Remove the unreachable `typescript-go` gitlink, `.gitmodules`, five-patch application, and `scripts/initialize.sh`. | A fresh fetch of the old gitlink failed with `upload-pack: not our ref`; the public-module fresh-cache build passed. |
| Workspace and local modules | Remove `go.work`, `go.work.sum`, 15 nested shim modules, and all local `replace` directives. | The consolidation prototype proved separate shim module identities unnecessary. `GOWORK=off go mod tidy -diff` and the public-module fresh-cache build passed. |

## Local workflow

Prerequisites are Git, bash, mise, and network access. Using the latest Go 1.26 patch is intentional project policy.

Build directly:

```sh
mise exec go@1.26 -- go build ./cmd/better-typescript
```

Run the full local gate:

```sh
./scripts/check.sh
```

Update the compiler version with:

```sh
./scripts/update-typescript-go.sh <version>
```

The update command changes `go.mod`, resolves the tag commit and its exact Microsoft parent, updates both provenance records, refreshes the retained `NOTICE.txt`, and runs the full gate. It fails if the release is not exactly one commit above a commit available from Microsoft upstream.
