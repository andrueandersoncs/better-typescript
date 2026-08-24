# tsgolint `no-error-type` prototype

> Throwaway prototype. It is not production integration.

## Question

Can a Better TypeScript rule that needs type identity run directly on tsgolint's Go AST and checker?

## Verdict

Yes. `no-error-type` ports cleanly.

The Go rule:

1. listens only for `TypeReference` nodes;
2. resolves the global `Error` symbol once per source-file rule context;
3. compares symbol pointers for each `Error` reference; and
4. reports only references to the built-in type.

This preserves the important behavior: a local type named `Error` is allowed, while `Error` and
`globalThis.Error` from the default library are reported. No AST conversion, IPC, or text-based type
comparison occurs inside the rule.

## Contents

- `tsgolint-no-error-type.patch`: rule, registration, tests, benchmark, and snapshots for tsgolint
  commit `5511fbc`.
- `benchmark-results.txt`: raw ten-run Go benchmark output.
- `benchmark-process.py`: fresh-process headless benchmark harness.
- `process-benchmark-results.json`: raw fresh-process measurements and summary.
- `fixture/`: standalone end-to-end input.
- `run.sh`: clones tsgolint, applies the patch, tests, benchmarks, builds, and runs the fixture.

## Run

From the Better TypeScript repository root:

```sh
./prototypes/tsgolint-no-error-type/run.sh
```

Requirements: `git`, `mise`, and `pnpm`.

## Benchmark

Environment: Apple M4 Max, 16 logical CPUs, Go 1.26.7. Each in-process benchmark ran for one second,
repeated ten times. The corpus has 57 program files, 35 type references, and two violations.

The matched baseline performs the same Go AST traversal and `TypeReference` listener dispatch but no
type-checker work.

| Case                    | Minimum |  Median | Maximum | Median bytes | Median allocations |
| ----------------------- | ------: | ------: | ------: | -----------: | -----------------: |
| Warm traversal baseline | 38.3 µs | 38.6 µs | 39.6 µs |     38,679 B |                500 |
| Warm `no-error-type`    | 39.7 µs | 40.1 µs | 41.3 µs |     45,405 B |                559 |
| Cold traversal baseline | 2.44 ms | 2.46 ms | 2.50 ms |  2,145,525 B |             12,402 |
| Cold `no-error-type`    | 2.53 ms | 2.55 ms | 2.64 ms |  2,370,651 B |             12,479 |

Median incremental cost over the matched baseline:

- Warm program: **1.55 µs total**, about **44 ns per type reference**, or **4.0%**.
- Fresh program: **86.4 µs total**, or **3.5%**. This includes checker cache initialization caused
  by the rule.

“Warm” reuses the TypeScript program and checker caches. “Cold” creates a new program each
operation, but the operating system file cache can remain warm.

### Fresh-process headless path

This benchmark starts a new tsgolint process for every sample. It includes process startup, JSON
input, tsconfig resolution, a fresh program, one requested rule, and framed diagnostic output. It
requested 54 source files. Fifty rule and no-rule samples ran in alternating order after three
warmups.

| Case                    |  Minimum |   Median |  Maximum |
| ----------------------- | -------: | -------: | -------: |
| No-rule baseline        | 23.80 ms | 24.63 ms | 26.54 ms |
| `no-error-type` enabled | 24.07 ms | 24.74 ms | 25.87 ms |

The median difference was **0.12 ms**, or **0.47%**. The ranges overlap, so this small process-level
difference should not be treated as a precise causal estimate. The useful result is that the
complete one-rule backend path had a **24.74 ms median** on this corpus.

These numbers measure this Go implementation. They are not a Go-versus-TypeScript comparison.

## Validated result

- The new rule tests pass.
- All tsgolint internal Go tests pass.
- The modified tsgolint binary builds.
- The fixture produces four expected `no-error-type` diagnostics.
- The local `Error` alias and value-level `new Error(...)` uses produce none.

## Limits

The patch registers the rule in tsgolint. Oxlint's Rust rule catalog is unchanged, so normal Oxlint
configuration cannot enable this new rule yet. The standalone tsgolint CLI is enough to prove the Go
implementation and typed semantics.
