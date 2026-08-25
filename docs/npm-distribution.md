# npm distribution

Better TypeScript is distributed on npm as a launcher package plus one package per supported platform.

## Packages

| Package | Purpose |
| --- | --- |
| `@andrueandersoncs/better-typescript` | Public command and platform selection |
| `@andrueandersoncs/better-typescript-darwin-arm64` | macOS Apple silicon binary |
| `@andrueandersoncs/better-typescript-darwin-amd64` | macOS Intel binary |
| `@andrueandersoncs/better-typescript-linux-arm64` | Linux ARM64 binary |
| `@andrueandersoncs/better-typescript-linux-amd64` | Linux x86-64 binary |

The unscoped `better-typescript` name belongs to another project.

The launcher declares all platform packages as optional dependencies. npm installs only the package matching the current operating system and CPU. The launcher resolves that package and runs its Go binary in the original working directory.

This design keeps downloads small and avoids install scripts. Node.js locates the executable. The linter remains one standalone Go binary.

## Use

```sh
npm install --save-dev @andrueandersoncs/better-typescript
npx better-typescript
```

The command keeps the existing CLI contract. It reads `./tsconfig.json`, writes progress and failures to stderr, and writes violations as NDJSON to stdout.

## Release

All five packages use the same version as the Git tag without its `v` prefix. A release:

1. Builds the four binaries with `CGO_ENABLED=0`.
2. Tests each supported package layout.
3. Publishes the four platform packages.
4. Publishes the launcher package last.

Platform packages include the project license and required third-party notices. The launcher has no runtime dependency other than Node.js and its matching optional package.

The npm scope and trusted publisher must exist before the first npm release. Publishing uses npm provenance from GitHub Actions.
