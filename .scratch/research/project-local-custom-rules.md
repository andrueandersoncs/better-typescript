# Project-local custom rules

_Checked 2026-08-26 against this repository and the cited first-party documentation and source._

## Conclusion

**The smallest general extension that preserves Better TypeScript's current analysis model is a
project-owned Go runner that statically links custom rules through a new public rule SDK.**

The stock binary should not dynamically load code from `better-typescript.json`. A project that
needs custom rules should keep a small Go command in its repository, import Better TypeScript's
public runner and its own rule package, and run that command instead. The linked rules can use the
same `typescript-go` AST, Program, checker, program cache, reporters, listener registration, and
single traversal as built-ins. Normal Go compilation supplies the loading boundary and rejects API
shape mismatches before linting.

This is not the easiest authoring experience for a TypeScript-only team. A TypeScript/JavaScript
sidecar would be more familiar, but it cannot receive the current Go pointer graph across a process.
It must either build a second TypeScript Program or require a new serialized AST and semantic-query
protocol. Both are materially larger and either duplicate analysis or expose less semantic data.

A narrow declarative pattern format can be useful later for syntax-only repository policy. It is not
a replacement for arbitrary type-aware rules.

## Observed facts

This section records source facts. Recommendations start under **Design synthesis**.

### Current Better TypeScript seams

- The CLI loads the root `tsconfig.json` and recursive project references, creates one
  `typescript-go` Program per config, and passes each config's non-declaration root files to the
  linter ([analysis](../../internal/analysis/analysis.go#L44-L76),
  [per-project run](../../internal/analysis/analysis.go#L115-L169)). A rule sees one Program at a
  time.
- A rule is a name plus a function that returns listeners keyed by `ast.Kind`. `RuleContext` exposes
  the current source file, Program, checker, a synchronized per-Program cache, and node/range
  reporters ([rule contract](../../internal/rule/rule.go#L33-L85)). These are Go pointers and
  closures, not a serialized interface.
- The linter creates listeners per rule and file, combines them by kind, and dispatches them during
  one traversal ([registration and dispatch](../../internal/linter/linter.go#L168-L230)). Checker
  workloads run concurrently. Custom rules that share state must therefore follow an explicit
  concurrency contract.
- Built-ins are statically imported into one sorted slice
  ([catalog](../../internal/rules/catalog.go)). The rule, linter, and analysis packages are under
  `internal/`, so an outside Go module cannot import the current rule API under Go's
  [internal-directory rule](https://pkg.go.dev/cmd/go#hdr-Internal_Directories). The compiler adapters
  themselves are public and pinned to `github.com/andrueandersoncs/typescript-go v0.1.0`
  ([module pin](../../go.mod#L1-L5), [compiler foundation](../../docs/compiler-foundation.md#L5-L24)).
- `better-typescript.json` currently permits only ordered file/rule overrides and rejects unknown
  fields ([decoder](../../cmd/better-typescript/config.go#L45-L76)). Rule names are resolved against
  the built-in catalog before analysis. `--rules` also selects from that catalog and skips config
  overrides. Discovery must therefore happen before name validation, or custom rules must already
  be linked into the runner.
- A diagnostic currently carries a source range and message inside the linter, but public output
  keeps only the range start, combines description and help, hard-codes `error`, and writes the
  stable six-field NDJSON record
  ([diagnostic types](../../internal/rule/rule.go#L40-L50),
  [normalization](../../internal/analysis/analysis.go#L135-L164)). There is no production edit,
  suggestion, or `--fix` API. Locations are one-based UTF-16 in output
  ([public contract](../../README.md#L89-L97)).
- The npm package launches a static platform binary. It does not host a JavaScript rule runtime
  ([distribution design](../../docs/npm-distribution.md#L17-L19),
  [launcher](../../npm/better-typescript/bin/better-typescript.js)).

### First-party extension precedents

#### ESLint and typescript-eslint

- ESLint rules export metadata and a `create(context)` function. `create` returns AST visitor
  callbacks. Rules report through `context.report`; metadata can define option schemas, messages,
  fixability, and suggestions
  ([ESLint custom rules](https://eslint.org/docs/latest/extend/custom-rules)). Flat config can import
  a project-local plugin directly from a file and assign it a namespace
  ([ESLint local and virtual plugins](https://eslint.org/docs/latest/use/configure/plugins#configure-a-local-plugin)).
- ESLint fixers return text edits. Conflicting edits may not be applied, enabled rules run again
  after edits for at most ten passes, multiple edits from one report must not overlap, and the docs
  advise small behavior-preserving fixes
  ([ESLint applying fixes](https://eslint.org/docs/latest/extend/custom-rules#applying-fixes)).
- typescript-eslint recommends `@typescript-eslint/utils` for typed rule definitions. Its parser
  services map ESTree nodes to TypeScript nodes and expose a `ts.Program`, type queries, symbol
  queries, and the backing checker
  ([typescript-eslint custom rules](https://typescript-eslint.io/developers/custom-rules/#typed-rules)).
  Typed linting asks TypeScript to analyze the whole project and has the cost of that build
  ([typed-linting performance](https://typescript-eslint.io/getting-started/typed-linting/#performance)).
  Its supported TypeScript versions are an explicit moving range, not an all-version promise
  ([dependency versions](https://typescript-eslint.io/users/dependency-versions/#typescript)).

These APIs show a good authoring shape: namespaced rule identity, metadata, per-file visitors,
central reporting, validated options, and structured fixes. They do **not** make JavaScript objects
compatible with Better TypeScript's Go-native AST and checker.

Microsoft's TypeScript language-service plugins are not a CI lint extension point. They can change
editor behavior, but Microsoft states that they are not loaded by `tsc` and cannot change command-line
type checking or emit
([language-service plugin scope](https://github.com/microsoft/TypeScript/wiki/Writing-a-Language-Service-Plugin#whats-a-language-service-plugin)).
Microsoft also tells plugin authors to use the TypeScript instance injected by the host because a
server may load a different TypeScript version
([plugin initialization](https://github.com/microsoft/TypeScript/wiki/Writing-a-Language-Service-Plugin#setup-and-initialization)).

#### Oxlint and Biome

- Oxlint accepts local or npm JavaScript plugins by import specifier. Its documented JavaScript API
  aims at ESLint compatibility but is alpha
  ([Oxlint JavaScript plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins.html),
  [writing plugins](https://oxc.rs/docs/guide/usage/linter/writing-js-plugins.html)). Oxlint's
  type-aware path is a separate `tsgolint` Go component that builds `typescript-go` Programs and
  returns structured diagnostics
  ([Oxlint type-aware architecture](https://oxc.rs/docs/guide/usage/linter/type-aware.html)).
- Biome supports repository-local GritQL files that match code patterns, register diagnostics, and
  propose rewrites. Its config takes explicit plugin paths and optional file globs. Rewrites carry a
  `safe` or `unsafe` classification; omitted classifications are unsafe
  ([Biome linter plugins](https://biomejs.dev/linter/plugins/)). Biome still describes its GritQL
  integration as actively developed, with missing features and possible bugs
  ([Biome GritQL status](https://biomejs.dev/reference/gritql/#integration-status)).

Oxlint demonstrates that familiar JavaScript plugins and native type-aware analysis can remain
separate backends. Biome demonstrates a safe, useful middle tier between a fixed catalog and
arbitrary executable plugins.

### Go and process boundaries

- Go's standard `plugin` package loads symbols in-process, but the Go documentation warns that it is
  supported only on Linux, FreeBSD, and macOS; cannot close plugins; is poorly covered by the race
  detector; can load dangerous code; and is likely to crash unless the host and plugin use exactly
  matching toolchains, flags, environment, and common dependency source. The same documentation
  suggests generating imports and building a normal static executable, or using IPC instead
  ([Go `plugin` warnings](https://pkg.go.dev/plugin#hdr-Warnings)).
- HashiCorp's first-party `go-plugin` documentation describes a different model: start each plugin
  as a subprocess, communicate by `net/rpc` or gRPC, negotiate a protocol version, and optionally
  verify a checksum. A plugin panic does not panic the host, but calls have RPC cost and the host
  must define client/server interfaces
  ([go-plugin README](https://github.com/hashicorp/go-plugin/blob/main/README.md#architecture)).
- Node's permission model can restrict filesystem, network, process, worker, native-addon, and WASI
  access. Node explicitly calls it a “seat belt” for trusted code and says it does not protect
  against malicious code
  ([Node permissions](https://nodejs.org/api/permissions.html#permissions)). A Node subprocess is a
  crash boundary, not a complete hostile-code sandbox.
- wazero is a Go WebAssembly runtime with interpreter and compiler modes, no CGO requirement, and a
  semantic-versioning promise for its public API
  ([wazero README](https://github.com/wazero/wazero/blob/main/README.md)). WebAssembly still needs an
  explicit ABI for AST data, semantic queries, diagnostics, and edits; it cannot directly consume
  Better TypeScript's Go pointers.

## Design synthesis

Everything below is a proposed design, not a claim about current behavior.

### Recommended MVP: linked Go rules

#### Authoring API

Publish two small public packages:

1. `sdk`: stable rule, listener, context, message, and plugin descriptors. Reuse the pinned public
   `typescript-go/ast`, `checker`, `compiler`, and `core` types rather than wrapping the compiler.
2. `runner`: the supported CLI entry point. It merges built-ins with supplied plugins, validates the
   registry, loads existing file/rule configuration, and calls the current analysis engine.

A project keeps a command such as `tools/better-typescript/main.go`:

```go
package main

import (
    projectrules "example.com/project/tools/better-typescript/rules"
    "github.com/andrueandersoncs/better-typescript/runner"
)

func main() {
    runner.Main(projectrules.Plugin)
}
```

A local rule keeps the current listener model:

```go
var Plugin = sdk.Plugin{
    Namespace: "project",
    Rules: []sdk.Rule{{
        Name: "no-console-log",
        Run: func(ctx sdk.RuleContext) sdk.RuleListeners {
            return sdk.RuleListeners{
                ast.KindCallExpression: func(node *ast.Node) {
                    // Inspect syntax or ctx.TypeChecker, then ctx.ReportNode(...).
                },
            }
        },
    }},
}
```

The public API should remove the unused `options any` parameter for its first version. Rule options
are not currently configurable. Add a typed or raw-JSON option contract only when a real rule needs
it.

#### Loading and execution boundary

The user runs `go run ./tools/better-typescript` or builds that command. Go imports are discovery;
the linker is the loading boundary. The resulting binary includes the built-in and local registries
and uses the existing Program and linter.

This preserves:

- one `typescript-go` Program per tsconfig;
- one listener-registration phase and traversal per file;
- direct, full checker access;
- current checker-worker parallelism and Program cache; and
- deterministic final normalization.

It also means custom code is fully trusted. It can panic, mutate shared state, access the process,
or perform I/O. The stock npm binary should never auto-build or execute a path merely because an
untrusted branch changed JSON configuration. A repository opts in by owning and invoking its custom
runner. CI should treat changes to that runner and its Go dependencies like changes to any executed
build script.

#### Configuration and discovery

Use plugin-qualified IDs: `project/no-console-log`. Reserve unqualified names for built-ins. Reject
empty namespaces, duplicate fully qualified IDs, and attempts to use a reserved namespace. Sort the
merged registry before selection.

Keep `better-typescript.json` focused on selection. Existing inclusions, exclusions, `--files`, and
`--rules` can work after validation uses the merged registry rather than `BuiltinRules`. Static
linking avoids the current `--rules`/config discovery cycle because custom rules exist before either
selection path runs.

Do not add implicit directory scanning in the MVP. The import list in the project command is the
complete, reviewable discovery record. A later `better-typescript init-rules` command may scaffold
that command and a nested `go.mod` for repositories that otherwise contain no Go code.

#### Diagnostics and fixes

Ship diagnostics only first. Reuse the current rule reporters and preserve the exact six-field NDJSON
contract. Prefix the namespace in `ruleName`.

A later SDK version can add immutable suggestions containing one or more same-file text edits:
`[start,end)` plus replacement text and a declared `safe`/`unsafe` kind. The host must validate
bounds and non-overlap, sort edits, define conflicts between rules, and expose a preview before any
write mode. ESLint's conflict and repeated-pass rules and Biome's safe/unsafe split are useful
precedents, but Better TypeScript needs its own deterministic contract. Do not let a rule receive a
writer callback as the fix API.

#### Versioning

- Pin the Better TypeScript module in the custom runner's `go.mod` and commit `go.sum`.
- Publish a compatibility policy for `sdk` before calling it stable. Breaking SDK or listener
  lifecycle changes require a major module version once the module reaches v1.
- Treat the exposed `typescript-go` adapter version as part of the SDK compatibility matrix. The
  runner should record both Better TypeScript and compiler versions in `--version` output.
- Add contract tests for per-file lifecycle, project references, concurrency, panic behavior,
  namespace collisions, deterministic diagnostics, and supported compiler versions.

Compilation catches type-shape incompatibility. It does not by itself prove semantic compatibility,
so the pin and contract tests still matter.

#### Performance

Analysis has no IPC, JSON AST serialization, second parse, or second type-check. The only new steady
state work is the custom listeners themselves. `go run` has build cost, but normal Go build caching
can amortize it. Measure cold build, warm start, files per second, allocations, and custom-rule time
separately before adding automatic rebuild machinery.

### Alternative: TypeScript/JavaScript subprocess

This is the better long-term choice only if TypeScript authoring is a hard product requirement.
Use an explicit project-relative ESM path and one long-lived subprocess per analysis run, not one
process per rule or file. A versioned handshake should return plugin name, version, rules, requested
syntax kinds, and capabilities. The host should send batched per-file snapshots and accept batched
diagnostics. Timeouts, message-size limits, cancellation, stderr capture, and clean process teardown
must be part of protocol version 1.

There are two semantic choices:

1. **Independent TypeScript/ESLint Program.** Reuse the established ESLint/typescript-eslint rule
   API. This gives the best author experience but repeats parsing, project loading, traversal, and
   type-checking under a different compiler implementation/version. It does not preserve Better
   TypeScript's current architecture.
2. **Better TypeScript snapshot API.** Serialize a stable node table with kinds, source ranges,
   parent/child relations, selected fields, source text, and batched semantic facts. This preserves
   one native Program but creates a second public AST/checker model. Arbitrary checker calls cannot
   be promised without an expensive remote-object protocol.

Start syntax-only if this path is chosen. Add narrow, measured semantic queries such as type text,
symbol identity, declarations, and resolved module identity only after representative rules prove
the API. Do not claim full `typescript-eslint` compatibility.

A subprocess isolates crashes, but loaded project code still has the operating-system privileges of
its Node process. Require explicit opt-in and a lockfile/checksum for any package-based plugin. Node
permissions can reduce accidental access but must not be described as a malicious-code sandbox.

### Alternative: declarative pattern rules

A small pattern format can be in-process, deterministic, and free of arbitrary code execution. It
can compile patterns into ordinary listeners and preserve the single traversal. Biome's GritQL
plugins show that repository-local patterns, diagnostics, globs, and classified rewrites are useful.

The limit is semantic depth. A pattern grammar over syntax and source text cannot expose the full
checker without becoming another query language and public AST schema. Do not call it parity with
Go rules. It is a separate product tier for syntax-only policy.

### Rejected for the first release

| Design | Why not first |
| --- | --- |
| Go `plugin` shared objects | Direct checker access and high speed, but the official portability, exact-build, race-detector, lifecycle, crash, and security constraints conflict with npm platform binaries. |
| Wasm/WASI rules | Better isolation and portable guests, but requires a new ABI and less familiar authoring toolchain before one useful rule can run. It cannot expose raw Go AST/checker values. |
| Per-node RPC callbacks | Preserves a central checker but places IPC in the hottest loop and makes parent/child/type navigation chatty. Batch snapshots first. |
| Auto-running config-discovered executables | Convenient, but a changed config in an untrusted checkout would cause linting to execute code. Require an explicit project runner or trust step. |
| Normalizing a second ESLint run as if it were native | Feasible as orchestration, but duplicates analysis and hides compiler and lifecycle differences. Users can already run ESLint alongside Better TypeScript. |

## Rollout path

1. **Make the seam public without changing behavior.** Add `sdk` and `runner` facades. Keep all 130
   built-ins and the stock CLI on the same runner. Add API/lifecycle documentation and contract
   tests.
2. **Prove one project-local runner.** Add an external test fixture module with one syntax rule, one
   checker-backed rule, one project-cache rule, namespace collision coverage, and the existing
   NDJSON assertions. The fixture must still show one traversal per file.
3. **Document and scaffold.** Provide the minimal nested-module layout and an optional scaffolding
   command. Do not auto-discover or auto-execute it.
4. **Stabilize diagnostics, then fixes.** First preserve current diagnostics exactly. Design text
   edits and conflict behavior as a separate versioned change with dry-run tests.
5. **Measure demand for TypeScript authoring.** Prototype a syntax-only batched Node sidecar with
   three representative rules before defining a semantic query ABI. Compare it with the linked Go
   runner on cold start, warm run, memory, crash handling, and CI threat model.
6. **Consider a declarative tier separately.** Adopt it only with a small, specified pattern grammar
   and clear “syntax-only” naming.

## Decision summary

| Property | Linked Go runner | JS/TS subprocess | Declarative patterns | Go `plugin` | Wasm |
| --- | ---: | ---: | ---: | ---: | ---: |
| Full current checker API | Yes | No, unless it builds another Program | No | Yes | No, without a large ABI |
| Keeps one native traversal | Yes | Only with a snapshot protocol | Yes | Yes | Only with a snapshot ABI |
| Familiar to TypeScript teams | No | Yes | Mostly | No | No |
| Crash isolation | No | Yes | Host-owned evaluator | No | Yes |
| Hostile-code isolation | No | No | Best of these choices | No | Capability-dependent |
| Cross-platform npm fit | Yes after project build | Yes with Node | Yes | No | Yes |
| MVP implementation size | Smallest general option | Medium to large | Small but narrow | Deceptively small | Large |

**Decision:** expose the current native rule seam as a build-time Go SDK and project-owned runner.
Keep the first release diagnostic-only and explicit. Treat JavaScript, declarative patterns, and
fixes as separate follow-up products rather than weakening the first contract.
