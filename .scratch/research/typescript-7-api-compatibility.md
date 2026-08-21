# TypeScript 7 API compatibility

_Checked 2026-08-21 against published package metadata and official source._

## Conclusion

**No. `typescript@7.0.2` cannot replace this repository's `typescript@6` dependency.**
TypeScript 7 provides the `tsc` CLI, but Better TypeScript embeds the TypeScript 5/6 compiler API.
TypeScript 7.0 has no compatible stable programmatic API.

## What Better TypeScript requires

- All three packages intentionally declare `typescript: "^5.0.0 || ^6.0.0"` as a peer
  dependency ([core](../../packages/core/package.json#L42-L44),
  [rules](../../packages/rules/package.json#L26-L28),
  [CLI](../../packages/cli/package.json#L23-L25)).
- Project loading calls the legacy root API directly: `findConfigFile`, `ts.sys`,
  `readConfigFile`, `parseJsonConfigFileContent`, project-reference resolution, and diagnostic
  formatting ([loadProject.ts](../../packages/core/src/project/loadProject/loadProject.ts#L41-L44),
  [loadProject.ts](../../packages/core/src/project/loadProject/loadProject.ts#L98-L114),
  [loadProject.ts](../../packages/core/src/project/loadProject/loadProject.ts#L147-L152)). It then
  calls `createCompilerHost` and `createProgram`
  ([loadProjectConfig.ts](../../packages/core/src/project/loadProject/loadProjectConfig.ts#L19-L31)).
- Linting requires the synchronous legacy `Program`, `TypeChecker`, `SourceFile`, and AST object
  model. For example, it calls `program.getTypeChecker()`, `getRootFileNames()`, and
  `getSourceFile()` ([linter.ts](../../packages/core/src/linter/linter.ts#L339-L371)). Rules also
  use many `TypeChecker` queries, node type guards, `SyntaxKind`, `TypeFlags`, and symbol/type
  objects.
- No production code creates a `LanguageService`. The relevant dependency is the in-process
  **compiler/type-checker and AST API**, not the editor LSP by itself.

## What “TypeScript 7 package” means now

- The stable package is **`typescript@7.0.2`**. npm's official metadata maps the `latest` tag to
  `7.0.2` ([dist-tags](https://registry.npmjs.org/-/package/typescript/dist-tags),
  [7.0.2 metadata](https://registry.npmjs.org/typescript/7.0.2)); the official release is not marked
  as a prerelease ([release](https://github.com/microsoft/TypeScript/releases/tag/v7.0.2)). It is
  the native Go port and provides `tsc`; the TypeScript team describes 7.0 as production-ready
  ([announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#battle-tested-and-ready-for-production)).
- **`@typescript/native-preview` is the older preview/nightly package name**, not the stable
  TypeScript 7 package. Its current `latest` is `7.0.0-dev.20260707.2`
  ([dist-tags](https://registry.npmjs.org/-/package/@typescript%2Fnative-preview/dist-tags)). The
  TypeScript team says nightlies are moving back to `typescript@next`
  ([announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#nightly-builds-and-typescriptnative-preview)).
- `typescript@next` is currently a **7.1 prerelease**, not a stable release
  ([dist-tags](https://registry.npmjs.org/-/package/typescript/dist-tags)).

## API comparison

The official 7.0 announcement states that TypeScript 7.0 “does not ship with an API”, expects a
new and different API in 7.1, and recommends `@typescript/typescript6` for tools needing
programmatic compiler access
([announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-60)).
The native repository likewise marks the API “not ready”
([README](https://github.com/microsoft/typescript-go/blob/2bd066d87f5bafd315be9f40889d0a60b9e58e0b/README.md#L25-L51)).

The `7.0.2` tarball does contain an **explicitly unstable, different API**, but its package root
exports only version data. Its other exports are split across `typescript/unstable/sync`,
`/unstable/async`, and `/unstable/ast`
([package metadata](https://registry.npmjs.org/typescript/7.0.2),
[source manifest](https://github.com/microsoft/typescript-go/blob/2bd066d87f5bafd315be9f40889d0a60b9e58e0b/_packages/native-preview/package.json#L38-L77)).
Therefore existing `import * as ts from "typescript"` statements do not expose `Program`,
`TypeChecker`, `SyntaxKind`, `createProgram`, or the other APIs above.

Even the unstable sync subpath is not drop-in compatible:

- Projects are created through `API.parseConfigFile()` and `API.updateSnapshot()`, not
  `createCompilerHost()`/`createProgram()`
  ([source](https://github.com/microsoft/typescript-go/blob/2bd066d87f5bafd315be9f40889d0a60b9e58e0b/_packages/native-preview/src/api/sync/api.ts#L129-L173)).
- `Project` owns separate `program` and `checker` values, and root files are a `Project` field
  ([source](https://github.com/microsoft/typescript-go/blob/2bd066d87f5bafd315be9f40889d0a60b9e58e0b/_packages/native-preview/src/api/sync/api.ts#L549-L587)).
  Its `Program` has `getSourceFileNames()`, not the legacy `getRootFileNames()` or
  `getTypeChecker()` shape
  ([source](https://github.com/microsoft/typescript-go/blob/2bd066d87f5bafd315be9f40889d0a60b9e58e0b/_packages/native-preview/src/api/sync/api.ts#L595-L657)).
- The unstable `Checker` implements some familiar queries, but it is a new remote/snapshot-backed
  contract, not the TypeScript 6 `TypeChecker`
  ([source](https://github.com/microsoft/typescript-go/blob/2bd066d87f5bafd315be9f40889d0a60b9e58e0b/_packages/native-preview/src/api/sync/api.ts#L811-L870)).

**Practical result:** keep TypeScript 6 for Better TypeScript's programmatic analysis. TypeScript 7
may be installed side-by-side for CLI compilation, as the official announcement documents. A
future move to TypeScript 7's API will require an adapter or migration and should wait for a stable,
sufficient API rather than changing the peer range alone.
