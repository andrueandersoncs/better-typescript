# tsgolint architecture and performance

Research snapshot: tsgolint [`5511fbc`](https://github.com/oxc-project/tsgolint/tree/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6), Oxc [`288f9a5`](https://github.com/oxc-project/oxc/tree/288f9a5188b9409cd0dfa34c25a0419e5eb8443b), its pinned typescript-go [`2bd066d`](https://github.com/microsoft/typescript-go/tree/2bd066d87f5bafd315be9f40889d0a60b9e58e0b), and the benchmark's typescript-eslint v8.64.0 [`414d9ab`](https://github.com/typescript-eslint/typescript-eslint/tree/414d9abbf66f77796ab12ec7e75b07722e592832). Sources are first-party repositories, histories, issues, and official project material only.

**Evidence labels**

- **Fact**: directly visible in source or official documentation.
- **Measured**: a published measurement with its method stated.
- **Inference**: a cost implied by the architecture, but not isolated by a benchmark.
- **Claim**: a project statement not established by the available measurement.

## Conclusion

**Measured:** tsgolint's current benchmark is **12–18x faster** than ESLint 9.23 + typescript-eslint 8.64 for 59 typed rules on four large repositories. This is a whole-process, fresh-process CLI comparison, not a `tsc` comparison and not a full `oxlint --type-aware` comparison.[^bench-results]

**Inference:** the likely causes are:

1. TypeScript parsing and semantic work run as compiled Go in typescript-go rather than as JavaScript from the `typescript` npm package.
2. Compared with typescript-eslint, rules consume the TypeScript AST directly instead of building and retaining an ESTree copy and TS↔ESTree node maps.
3. Compiled Go rule callbacks and up to four concurrent checker workloads replace the benchmark's single-process JavaScript rule execution.
4. The process bridge is coarse: paths/config enter once and only diagnostics leave. No AST or type graph crosses it.

The traversal count is not an advantage over ESLint: both systems combine all rule listeners into one traversal per file. The benchmark does not ablate any factor, so each factor's share is unknown. It also does not compare tsgolint with a bespoke TypeScript linter that traverses `ts.SourceFile` directly. Microsoft reports large native-port gains for compilation and editor loading, but those are supporting evidence about the backend, **not tsgolint lint benchmarks**.[^native-announcement] The port deliberately retains TypeScript's algorithms and therefore its algorithmic complexity.[^why-port]

## End-to-end execution

1. **Oxlint front end.** Oxlint discovers files, applies ignores and config, runs its Rust syntax rules, and owns reporting; tsgolint owns TypeScript programs and typed rules.[^official-split] In the current file runner, native lint completes before `type_aware_linter.lint(...)` is called, so the two layers are sequential, not concurrently overlapped.[^runner-order]
2. **Batch request.** Oxlint keeps only enabled rules marked as tsgolint rules, resolves their options per file, groups files that have the same rule set, and builds payload v2. The payload contains absolute paths, rule names/options, optional source overrides, and syntactic/semantic diagnostic flags.[^oxc-input] Normal CLI runs send paths, not source text. LSP/in-memory runs send the full current text in `source_overrides`.[^lsp-overrides]
3. **Process boundary.** Oxlint starts `tsgolint headless`, JSON-serializes the complete request to stdin, then closes stdin.[^spawn] The npm package is a small Node launcher that selects and synchronously executes a platform-specific Go binary; `OXLINT_TSGOLINT_PATH` can point Oxlint directly at a binary.[^npm-launcher]
4. **File system and project assignment.** The Go process reads all stdin once, layers source overrides over the OS file system, and adds bundled TypeScript libraries plus an in-process VFS cache.[^headless-input] It searches for the governing `tsconfig` for every requested file in parallel, following project references. Files with no governing config go to one inferred program.[^assignment]
5. **Program creation.** Programs are created **one config at a time**. Each config is parsed, a cached compiler host is created, and typescript-go constructs and binds a `compiler.Program`. Only requested files are linted, but their complete program dependency graph must be loaded. Unmatched files use fixed inferred-project defaults.[^program-loop] Project configuration uses source project references rather than emitted declarations.[^create-program]
6. **Optional TypeScript diagnostics.** `--type-aware` alone gives rules a checker but does not report ordinary TS syntax/semantic errors. `--type-check` additionally requests both. Semantic errors are obtained with a batch API before rule linting and filtered per requested file.[^type-errors]
7. **Rules.** A rule returns a map from typescript-go AST kinds to callbacks. Its context contains the source file, shared program, checker, and lazy diagnostic/fix functions.[^rule-api] For each file, all active callbacks are registered by kind. A single depth-first walk dispatches matching enter/exit/pattern listeners; callback slices and the context builder are reused between files.[^rule-runner]
8. **Results.** Worker goroutines send diagnostics to one output goroutine. Each result is JSON, prefixed with a five-byte frame (`uint32` little-endian length + one-byte kind), then streamed on stdout.[^go-output] Oxlint incrementally parses those frames, restores severity, applies disable directives, reads source text only as needed for display/fixes, and emits or applies diagnostics.[^rust-output]

Thus “direct AST” means **typescript-go AST → Go rules**. It does **not** mean reuse of Oxlint's Rust AST. A full Oxlint typed run parses syntax once in Oxc and again while typescript-go builds its program. The avoided work is specifically TypeScript-AST-to-ESTree conversion inside the typed-rule backend.

## Language, checker integration, and bridge

**Fact:** production analysis and all 59 rules are Go. JavaScript is used for the npm launcher and repository tooling. The binary pins one typescript-go revision and replaces shim modules locally.[^go-dependency] Generated shims alias internal AST/checker/compiler types and use `//go:linkname` to call internal functions such as `NewProgram` and `ForEachCheckerParallel`.[^compiler-shim] This gives rules in-process pointers to TypeScript nodes and checker objects: there is no foreign-function call or serialization on a type query.

This is also a maintenance boundary, not a public API. The pinned typescript-go snapshot labels its API “not ready”, while tsgolint's own architecture says the internal-linkname approach is not recommended and requires version synchronization.[^tsgo-status][^shim-warning] Local patches expose internals and cache VFS reads; maintainers state the patches are intended not to change TypeScript behavior.[^patches]

The JS/Rust↔Go bridge is deliberately not chatty. Input is one JSON batch. Output has binary **framing**, but each payload is still JSON. ASTs, symbols, types, and source text in ordinary disk runs stay in Go. This matches Microsoft's planned native API direction: curated, batch-style IPC because serialization is not free.[^tsgo-api]

## Concurrency and incremental behavior

- **Fact:** config lookup starts `GOMAXPROCS` workers.[^config-parallel]
- **Fact:** tsgolint asks the linter for `GOMAXPROCS` workers, but a program's default typescript-go checker pool has four checkers (or fewer than four files). The linter creates one shared file queue and one workload per checker. Therefore a normal single program has at most four concurrent file/rule consumers unless the checker count is configured differently; “uses all CPU cores” is too broad.[^checker-workloads][^checker-pool]
- **Fact:** programs are processed sequentially. Separate programs do not run in parallel and cannot share checker/type state. This can repeat dependency parsing and module resolution across many tsconfigs.[^program-loop]
- **Fact:** output serialization is single-goroutine, but it streams while workers continue.
- **Fact:** there is no persistent incremental lint state. Every Oxlint invocation spawns a fresh process, reads a single request, recreates configs/programs, and exits. LSP `lint_source` also spawns a new child for each call.[^lsp-spawn] An open server-mode proposal exists specifically to remove repeated work.[^server-issue] The per-process VFS caches filesystem reads only during that run; tsgolint does not load/write `.tsbuildinfo`.

The distinction matters: typescript-go itself supports incremental build, while its snapshot's watch mode says it has no incremental rechecking.[^tsgo-status] tsgolint uses neither path; it calls ordinary `compiler.NewProgram`.

## Cost against `typescript`-package linters

The published comparison is specifically against ESLint + typescript-eslint. It is **not** a controlled Go-versus-TypeScript language benchmark. A bespoke TypeScript linter can call `ts.createProgram`, traverse `ts.SourceFile` directly, combine all rule callbacks into one walk, and avoid ESTree plus node maps. No published tsgolint benchmark measures that design. TypeScript also creates the checker lazily and caches semantic results, while typescript-eslint caches one `Program` per project during a single CLI run.[^ts-lazy-checker][^tse-program]

| Cost | Benchmarked ESLint + typescript-eslint backend | tsgolint | Evidence class |
| --- | --- | --- | --- |
| Semantic engine | `typescript` npm package executes in the JS runtime | compiled typescript-go port | Fact |
| Program reuse in one CLI run | lazily creates and caches each project `ts.Program` | one Go `Program` per discovered config | Fact[^tse-program] |
| Rule AST | recursively converted ESTree object graph | original typescript-go AST | Fact[^estree-convert] |
| Typed-node access | retains TS AST + ESTree AST + weak maps; typed helpers map ESTree nodes back before checker calls | direct node pointer to checker | Fact[^node-maps] |
| Traversal/rules | combines JS rule listeners into one ESTree traversal per file | combines compiled Go callbacks into one TypeScript-AST traversal per file | Fact[^eslint-traversal] |
| Cross-language IPC | none; all JS runs in one process | process startup + one input JSON + JSON diagnostics | Fact |
| Parallel typed work | benchmark command requests no ESLint concurrency | normally up to four checker workloads consume files concurrently | Fact for this benchmark |
| Repeated editor run | project-service setups can retain state in-process | fresh child/program in current Oxlint LSP path | Fact |

**Inference:** against typescript-eslint, native execution, lower allocation pressure, no ESTree conversion/maps, compiled rule callbacks, and concurrent checkers all plausibly reduce wall time. Microsoft's Go rationale says batch compilation can pay little GC cost and use explicit memory layouts, but Go is still garbage-collected and tsgolint's monorepo profile shows GC can be material.[^why-go] Coarse IPC keeps serialization proportional to configuration plus diagnostics rather than AST size. These gains can exceed Go-process startup on large repositories.

Against a direct-AST TypeScript implementation, only the native semantic engine, runtime representation, compiled rule code, and concurrency differences remain; the ESTree advantage disappears. Their exact combined or individual speedups are unmeasured. Small or repeated editor requests can favor a warm TypeScript project service. JavaScript tools can also use worker processes, usually at the cost of duplicated `Program` state. Rule mix, project graph, TypeScript version, diagnostic count, and cache warmth can dominate.

## Rules and limitations

The registry has **59** ports. The only two targeted rules not implemented are `naming-convention` and `prefer-destructuring`.[^rules]

Implemented: `await-thenable`, `consistent-return`, `consistent-type-exports`, `dot-notation`, `no-array-delete`, `no-base-to-string`, `no-confusing-void-expression`, `no-deprecated`, `no-duplicate-type-constituents`, `no-floating-promises`, `no-for-in-array`, `no-implied-eval`, `no-meaningless-void-operator`, `no-misused-promises`, `no-misused-spread`, `no-mixed-enums`, `no-redundant-type-constituents`, `no-unnecessary-boolean-literal-compare`, `no-unnecessary-condition`, `no-unnecessary-qualifier`, `no-unnecessary-template-expression`, `no-unnecessary-type-arguments`, `no-unnecessary-type-assertion`, `no-unnecessary-type-conversion`, `no-unnecessary-type-parameters`, `no-unsafe-argument`, `no-unsafe-assignment`, `no-unsafe-call`, `no-unsafe-enum-comparison`, `no-unsafe-member-access`, `no-unsafe-return`, `no-unsafe-type-assertion`, `no-unsafe-unary-minus`, `no-useless-default-assignment`, `non-nullable-type-assertion-style`, `only-throw-error`, `prefer-find`, `prefer-includes`, `prefer-nullish-coalescing`, `prefer-optional-chain`, `prefer-promise-reject-errors`, `prefer-readonly`, `prefer-readonly-parameter-types`, `prefer-reduce-type-parameter`, `prefer-regexp-exec`, `prefer-return-this-type`, `prefer-string-starts-ends-with`, `promise-function-async`, `related-getter-setter-pairs`, `require-array-sort-compare`, `require-await`, `restrict-plus-operands`, `restrict-template-expressions`, `return-await`, `strict-boolean-expressions`, `strict-void-return`, `switch-exhaustiveness-check`, `unbound-method`, and `use-unknown-in-catch-callback-variable`.[^registry]

Other limits:

- It targets TypeScript 7.0+, so removed legacy options/features require migration.[^compat]
- It is a fixed built-in catalog, not an API for arbitrary JS TypeScript-aware plugins. The standalone CLI is explicitly unsupported in favor of Oxlint.[^unsupported-cli]
- Very large/many-project monorepos can use high memory and repeat program work. An open Kibana report measured 214 seconds for one rule, with 112 seconds in module resolution and 27.8% CPU in GC; these are issue-specific observations, not general benchmarks.[^monorepo]
- Current Oxc docs warn about high memory on very large codebases.[^stability]
- The architecture document mentions rare deadlocks, but supplies no reproduction or measurement. Treat that as an unverified claim, not an established limitation.[^shim-warning]

## Benchmark audit

| Repository | ESLint + typescript-eslint | tsgolint | Reported ratio |
| --- | ---: | ---: | ---: |
| VS Code 1.99.0 | 83.2 s | 6.96 s | 12x |
| TypeScript 5.8.2 | 27.2 s | 1.94 s | 14x |
| TypeORM 0.3.22 | 13.2 s | 0.75 s | 18x |
| Vue 3.5.13 | 12.3 s | 0.95 s | 13x |

**Measured method:** Apple M4 Pro, 12 cores; ten runs shown; Hyperfine with one warm-up; failures ignored; Node heap cap 16 GiB; pinned repository tags; ESLint 9.23.0 and typescript-eslint 8.64.0; the same list of 59 rules; project-specific globs/tsconfigs.[^bench-results][^bench-script][^bench-setup][^bench-projects][^bench-rules]

**What it establishes:** on that machine and corpus, the standalone Go CLI's complete typed-rule run had much lower wall time than the specified ESLint/typescript-eslint commands.

**What it does not establish:**

- It does not measure `tsc`, type-check-only work, full Oxlint syntax + typed work, LSP latency, steady-state incremental work, peak memory, or per-factor causality.
- It runs the built `../../tsgolint` binary directly. It excludes Oxlint and the npm Node launcher.
- The setup pins ESLint and typescript-eslint but does not explicitly install/pin the `typescript` npm package. The JS checker version therefore comes from each project/dependency resolution, while tsgolint pins one TypeScript 7 Go revision.
- The report says TypeORM and Vue used manually adjusted TypeScript 7 configurations, but the published setup scripts do not make or preserve those edits. The recipe therefore does not fully reproduce the reported input.[^bench-config-gap]
- ESLint receives explicit globs; tsgolint selects requested source files from the tsconfig program. The scripts publish no file-count or diagnostic-parity check.
- Ignored non-zero exits and differing rule implementations mean result equivalence was not demonstrated.

Finally, the repository's headline says **20–40x** and its main README shows an older 22–34x table,[^headline] but the dedicated current benchmark page says **12–18x**.[^bench-results] The latter has the clearer current method and should be quoted. “20–40x faster than JavaScript”, “all available CPU cores”, “efficient memory”, and “zero conversion” are project claims: only the narrow TS-AST→rule conversion claim is directly established; the broad performance and resource claims are not independently isolated.[^architecture-claims]

## History relevant to the design

The project began as a typescript-eslint proof of concept, with the linter/rule tester added in March 2025, then gained Oxlint's one-shot headless mode, grouped config payloads, correct per-checker file partitioning, parallel tsconfig lookup, and per-rule timing before the current benchmark refresh.[^history] The current repository records that it was forked into Oxc with the original author's permission.[^origin] This history explains why the core remains a fixed compatibility port with an IPC backend rather than an embeddable TypeScript API.

[^official-split]: Oxc, [type-aware overview](https://github.com/oxc-project/website/blob/84e863ff38308165e2b8ceb4c47363f042895ad2/src/docs/guide/usage/linter/type-aware.md#L6-L20).
[^runner-order]: Oxc, [`lint_runner.rs` lines 260–297](https://github.com/oxc-project/oxc/blob/288f9a5188b9409cd0dfa34c25a0419e5eb8443b/crates/oxc_linter/src/lint_runner.rs#L260-L297).
[^oxc-input]: Oxc, [payload construction and schema](https://github.com/oxc-project/oxc/blob/288f9a5188b9409cd0dfa34c25a0419e5eb8443b/crates/oxc_linter/src/tsgolint.rs#L543-L649).
[^lsp-overrides]: Oxc, [`lint_source` source overrides and child spawn](https://github.com/oxc-project/oxc/blob/288f9a5188b9409cd0dfa34c25a0419e5eb8443b/crates/oxc_linter/src/tsgolint.rs#L409-L443).
[^spawn]: Oxc, [`spawn_tsgolint`](https://github.com/oxc-project/oxc/blob/288f9a5188b9409cd0dfa34c25a0419e5eb8443b/crates/oxc_linter/src/tsgolint.rs#L346-L400).
[^npm-launcher]: tsgolint, [npm launcher](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/npm/core/bin/tsgolint.js#L1-L20).
[^headless-input]: tsgolint, [one-shot input and VFS setup](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/cmd/tsgolint/headless.go#L236-L263).
[^assignment]: tsgolint, [assignment to configured/inferred workloads](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/cmd/tsgolint/headless.go#L265-L322).
[^program-loop]: tsgolint, [sequential configured programs and inferred program](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/internal/linter/linter.go#L80-L210).
[^create-program]: tsgolint, [program options and binding](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/internal/utils/create_program.go#L76-L117).
[^type-errors]: tsgolint, [optional TS diagnostics](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/internal/linter/linter.go#L316-L366) and [headless flags](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/cmd/tsgolint/headless.go#L413-L450).
[^rule-api]: tsgolint, [rule/listener/context types](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/internal/rule/rule.go#L32-L43) and [context fields](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/internal/rule/rule.go#L118-L130).
[^rule-runner]: tsgolint, [combined AST walk](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/internal/linter/linter.go#L395-L462) and [listener dispatch/reuse](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/internal/linter/linter.go#L464-L539).
[^go-output]: tsgolint, [JSON payload plus five-byte frame](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/cmd/tsgolint/headless.go#L181-L205) and [single output goroutine](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/cmd/tsgolint/headless.go#L329-L402).
[^rust-output]: Oxc, [stream iterator](https://github.com/oxc-project/oxc/blob/288f9a5188b9409cd0dfa34c25a0419e5eb8443b/crates/oxc_linter/src/tsgolint.rs#L931-L980) and [frame parser](https://github.com/oxc-project/oxc/blob/288f9a5188b9409cd0dfa34c25a0419e5eb8443b/crates/oxc_linter/src/tsgolint.rs#L1233-L1308).
[^go-dependency]: tsgolint, [Go module, local shims, and pinned typescript-go](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/go.mod#L1-L47).
[^compiler-shim]: tsgolint, [compiler aliases and linknames](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/shim/compiler/shim.go#L1-L52).
[^tsgo-status]: typescript-go, [feature/API/incremental status at the pinned revision](https://github.com/microsoft/typescript-go/blob/2bd066d87f5bafd315be9f40889d0a60b9e58e0b/README.md#L26-L52).
[^shim-warning]: tsgolint, [shim warning and stated limits](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/ARCHITECTURE.md#L81-L117).
[^patches]: tsgolint, [patch policy](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/patches/README.md#L1-L10) and [VFS read cache patch](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/patches/0005-perf-vfs-cache-ReadFile-results-in-cachedvfs.patch#L17-L68).
[^tsgo-api]: Microsoft TypeScript, [native API/IPC FAQ](https://github.com/microsoft/typescript-go/discussions/455).
[^config-parallel]: tsgolint, [`FindTsConfigParallel`](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/internal/utils/find_tsconfig.go#L216-L267).
[^checker-workloads]: tsgolint, [checker workload queue and workers](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/internal/linter/linter.go#L368-L393) and [worker loop](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/internal/linter/linter.go#L464-L506).
[^checker-pool]: typescript-go, [default checker count and assignment](https://github.com/microsoft/typescript-go/blob/2bd066d87f5bafd315be9f40889d0a60b9e58e0b/internal/compiler/checkerpool.go#L40-L57) and [parallel pool execution](https://github.com/microsoft/typescript-go/blob/2bd066d87f5bafd315be9f40889d0a60b9e58e0b/internal/compiler/checkerpool.go#L98-L133).
[^lsp-spawn]: Oxc, [`lint_source` creates a child per call](https://github.com/oxc-project/oxc/blob/288f9a5188b9409cd0dfa34c25a0419e5eb8443b/crates/oxc_linter/src/tsgolint.rs#L409-L443).
[^server-issue]: tsgolint, [open headless server-mode proposal #101](https://github.com/oxc-project/tsgolint/issues/101).
[^ts-lazy-checker]: TypeScript, [`getTypeChecker` lazily creates the checker](https://github.com/microsoft/TypeScript/blob/beb69e4cdd61b1a0fd9ae21ae58bd4bd409d7217/src/compiler/program.ts#L2725-L2727), and typescript-eslint, [typed-lint performance notes](https://github.com/typescript-eslint/typescript-eslint/blob/56c9ed90d0aee0b5a71cfc39fc76b715b82e3ea8/docs/troubleshooting/typed-linting/Performance.mdx#L12-L31).
[^tse-program]: typescript-eslint, [single-run program cache](https://github.com/typescript-eslint/typescript-eslint/blob/414d9abbf66f77796ab12ec7e75b07722e592832/packages/typescript-estree/src/parser.ts#L169-L197) and [`ts.createProgram`](https://github.com/typescript-eslint/typescript-eslint/blob/414d9abbf66f77796ab12ec7e75b07722e592832/packages/typescript-estree/src/create-program/useProvidedPrograms.ts#L56-L69).
[^eslint-traversal]: ESLint, [listener registration and one traversal event queue](https://github.com/eslint/eslint/blob/2aaadceec13e6df89a0c56e2b6ce4a145c1ac3aa/lib/linter/linter.js#L1339-L1383).
[^estree-convert]: typescript-eslint, [recursive TS AST→ESTree conversion](https://github.com/typescript-eslint/typescript-eslint/blob/414d9abbf66f77796ab12ec7e75b07722e592832/packages/typescript-estree/src/ast-converter.ts#L12-L38).
[^node-maps]: typescript-eslint, [conversion and maps](https://github.com/typescript-eslint/typescript-eslint/blob/414d9abbf66f77796ab12ec7e75b07722e592832/packages/typescript-estree/src/parser.ts#L248-L280), [map population](https://github.com/typescript-eslint/typescript-eslint/blob/414d9abbf66f77796ab12ec7e75b07722e592832/packages/typescript-estree/src/convert.ts#L2852-L2863), and [mapped checker calls](https://github.com/typescript-eslint/typescript-eslint/blob/414d9abbf66f77796ab12ec7e75b07722e592832/packages/typescript-estree/src/createParserServices.ts#L23-L51).
[^why-go]: Microsoft TypeScript, [“Why Go?” FAQ](https://github.com/microsoft/typescript-go/discussions/411).
[^native-announcement]: Microsoft TypeScript, [native-port announcement and its compilation/editor measurements](https://devblogs.microsoft.com/typescript/typescript-native-port/).
[^why-port]: Microsoft TypeScript, [port compatibility and same-algorithmic-complexity rationale](https://github.com/microsoft/typescript-go/discussions/410).
[^rules]: tsgolint, [59/61 and missing rules](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/README.md#L169-L175).
[^registry]: tsgolint, [runtime registry](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/cmd/tsgolint/main.go#L162-L222).
[^compat]: Oxc, [TypeScript compatibility](https://github.com/oxc-project/website/blob/84e863ff38308165e2b8ceb4c47363f042895ad2/src/docs/guide/usage/linter/type-aware.md#L260-L269).
[^unsupported-cli]: tsgolint, [unsupported CLI warning](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/cmd/tsgolint/main.go#L364-L372).
[^monorepo]: tsgolint, [large-monorepo performance issue #295](https://github.com/oxc-project/tsgolint/issues/295).
[^stability]: Oxc, [stability notes](https://github.com/oxc-project/website/blob/84e863ff38308165e2b8ceb4c47363f042895ad2/src/docs/guide/usage/linter/type-aware.md#L271-L277).
[^bench-results]: tsgolint, [current benchmark results and ten-run details](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/benchmarks/README.md#L8-L99).
[^bench-script]: tsgolint, [Hyperfine commands](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/benchmarks/bench.sh#L1-L31).
[^bench-setup]: tsgolint, [pinned ESLint/typescript-eslint setup](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/benchmarks/setup.sh#L1-L16).
[^bench-projects]: tsgolint, [pinned project tags](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/benchmarks/clone-projects.sh#L1-L9).
[^bench-rules]: tsgolint, [ESLint parser/project setup and rule list](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/benchmarks/eslint.config.mjs#L32-L117).
[^bench-config-gap]: tsgolint, [stated manual TypeScript 7 config adjustments](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/benchmarks/README.md#L8-L13) and [setup script, which does not apply them](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/benchmarks/setup.sh#L1-L16); pinned [TypeORM config](https://github.com/typeorm/typeorm/blob/6c5668bd82233301642593a83236cc4ae315d6fc/tsconfig.json#L2-L16) and [Vue config](https://github.com/vuejs/core/blob/6eb29d345aa73746207f80c89ee8b37ff7b949c9/tsconfig.json#L2-L31).
[^headline]: tsgolint, [20–40x headline](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/README.md#L14-L27) and [older table](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/README.md#L111-L133).
[^architecture-claims]: tsgolint, [project's stated speed sources](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/ARCHITECTURE.md#L97-L110).
[^history]: tsgolint commits: [initial linter](https://github.com/oxc-project/tsgolint/commit/df837410d85f314752538c77950f0824e23c1f56), [headless mode](https://github.com/oxc-project/tsgolint/commit/7cda054b090843cbb7d15ffcd7ae05794eb45196), [grouped payload](https://github.com/oxc-project/tsgolint/commit/707c5e775664c5db86fc3c93165bf753467015db), [checker partitioning](https://github.com/oxc-project/tsgolint/commit/05109ae807493f9b92d587d5f36cca634aa0b68b), [parallel config lookup](https://github.com/oxc-project/tsgolint/pull/555), [timings](https://github.com/oxc-project/tsgolint/pull/960), and [benchmark refresh](https://github.com/oxc-project/tsgolint/pull/1102).
[^origin]: tsgolint, [origin statement](https://github.com/oxc-project/tsgolint/blob/5511fbcdb01add5b4d06d0ccb1ea506e0f4cfaa6/README.md#L20-L27).
