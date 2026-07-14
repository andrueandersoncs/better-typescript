# Better TypeScript

Better TypeScript is a TypeScript analysis CLI for coding agents. It uses the
official `typescript` package to inspect source files and type information,
emit actionable signals to stdout, and exit by default. Output is one NDJSON
event per line unless `--pretty` projects the same events into human-readable
text blocks. `--watch` opts into continuous analysis as files change.

## Goal

Better TypeScript's end users are **coding agents**. The useful output is not a
long checklist of local style nits; it is the smallest instruction that moves
the code toward the shape this project enforces.

The architecture is intentionally plain:

- A check is any function that consumes the loaded AST-node stream and produces
  an Effect `Stream` of `Detection` values.
- The runner materializes each named check into one completed `Signal` for an
  analysis batch: `{ name, reported, detections }`.
- `reported` controls visibility only. Reported checks render local detection
  blocks; silent checks still run, still affect watch equivalence, and still feed
  derivation, but render no local block.
- `derive` receives the completed `Signal[]` for the batch and emits aggregate
  `Advice` values.
- The CLI renders derived `Advice` and reported local detections into the event
  stream.

There are no suppressions, severities, or result-based exit gate. Per-check
path scopes only limit where a check executes. If a signal appears, fix the cause
in the code.

## What the CLI does

1. Discovers the TypeScript project from its `tsconfig.json`.
2. Loads the project's `Wiring` from `better-typescript.config.ts` or the
   built-in preset.
3. By default, analyzes the current snapshot once, emits the initial report, and
   exits `0`.
4. With `--watch`, starts a TypeScript watch program per leaf project, emits the
   same initial report, then stays alive and pushes only what changed:
   - a block re-emits as a `signal` event whenever its content changes;
   - a block that disappears emits one `cleared` event;
   - a rebuild with no visible change emits nothing.

Aggregate advice blocks lead when they explain a broader shape, such as an
imperative state manager, a pipeline-hostile module, a hot subsystem, or systemic
hotspots. Reported check blocks render their local detection locations after the
aggregate advice.

### Output format

By default stdout is NDJSON: one JSON event per line. There are three event
shapes, discriminated by `_tag`:

```json
{"_tag":"signal","key":{"_tag":"rule","name":"no-throw","message":"Avoid throwing errors with throw.","hint":"Create a custom error with Schema.TaggedError..."},"text":"no-throw\n  Avoid throwing errors with throw.\n  Hint: ...\n  src/cases.ts:4:3"}
{"_tag":"cleared","key":{"_tag":"rule","name":"no-throw","message":"Avoid throwing errors with throw.","hint":"Create a custom error with Schema.TaggedError..."},"text":"no-throw — cleared: Avoid throwing errors with throw."}
{"_tag":"empty","rootPath":"/path/to/project"}
```

- `signal` — a report block appeared or its content changed; `text` is the full
  rendered block. The default one-shot run emits one `signal` per initial report
  block.
- `cleared` — a previously emitted block disappeared; `text` is its one cleared
  line. Only `--watch` can emit `cleared` events because one-shot runs have no
  previous report state.
- `empty` — the initial report found no signals. A one-shot run emits exactly
  one `empty` event when the snapshot is signal-free.

`key` is the block's stable identity across events. Local detection keys still
serialize as `{ _tag: "rule", name, message, hint }`; aggregate advice keys
still serialize as `{ _tag: "advice", level, path, title }`. Those two tag
names are wire-format compatibility forms only. Internally, checks and derived
`Advice` are the current model.

With `--pretty`, the CLI renders the same events as human-readable text blocks
instead (each block followed by a blank line; the empty report prints
`No signals in /path/to/project.`). Any remaining local/aggregate pretty-block
vocabulary historically described as rule/advice output is presentation
compatibility only, just like the NDJSON key tags.

Status lines go to stderr; stdout carries only the event stream. The default
one-shot status is `Analyzing /path/to/project.`. The watch status is
`Watching /path/to/project for changes.`. Capture or filter stdout by piping:

```sh
better-typescript | tee report.ndjson
better-typescript | jq -r 'select(._tag == "signal") | .text'
```

## Usage

```sh
better-typescript
```

By default, the CLI analyzes the current working directory once and exits after
printing the initial report.

### Options

- `--project <directory>`: analyze a specific project directory instead of the
  current working directory. Config is resolved directly under this directory.
- `--pretty`: render human-readable text blocks instead of NDJSON events.
- `--watch`: keep running after the initial report, watch TypeScript project
  changes, and emit changed/cleared deltas.

## Packages

This repository is an npm workspaces monorepo:

- `@better-typescript/core` — analysis kernel (`engine/*`, `project/*`)
- `@better-typescript/checks` — built-in checks and default preset wiring
- `@better-typescript/cli` — `better-typescript` binary

## Configuration and extension

Better TypeScript exposes one intentional public interface per Module through
package exports. Re-exporting is valid when an entry module is that seam; callers
must not bypass it through package `src/` or `internal/` paths.

- `@better-typescript/core/engine/check`: `nodeCheck`, `fileCheck`,
  `checkFromSubscriptions`, `combineAll`, `nodeSubscriptions`,
  `fileSubscriptions`, `withProgramIndex`
- `@better-typescript/core/engine/check/data`: `Check`, `CheckContext`,
  `Subscription`
- `@better-typescript/core/engine/location`: `Detection`, `Location`, `detection`,
  `locateNode`
- `@better-typescript/core/engine/derive`: `Advice`, `deriveSignals`,
  `adviceLocation`, `evidenceItem`, and related derivation helpers
- `@better-typescript/core/engine/report`: `NamedCheck`, `Signal`, `Wiring`,
  `namedCheck`, `silentCheck`, `scopeCheck`, `signalOf`, `makeWiring`,
  `withFallbackAdvice`, `reportFromWiring`
- `@better-typescript/core/engine/watch`: `watchReportFromWiring`, report events
- `@better-typescript/core/engine/sources`: program/source stream helpers
- `@better-typescript/checks/preset`: default `report` / `watchReport` runners
- `@better-typescript/checks/preset/defaultWiring`: `defaultChecks`, `defaultDerive`,
  `defaultWiring`
- `@better-typescript/checks/preset/functionalCoreEffectWiring`: opt-in
  functional-core boundary checks, derived architecture advice, and policy-aware
  wiring factories
- `@better-typescript/checks/functionalCoreEffect/policy`: conventional and
  explicit architecture-role classifiers plus capability/resource policy
  configuration
- `@better-typescript/checks/<name>`: individual check modules

### Config resolution

The CLI looks for exactly one config file:

```text
<project-directory>/better-typescript.config.ts
```

`<project-directory>` is the `--project` value when supplied, otherwise the
current working directory. The config file is loaded with `jiti`, so normal
TypeScript config modules work with the published Node bin. There is no config
lookup in parent directories, no `package.json` field, no `extends` chain, and
no dynamic plugin discovery.

If no config file exists, the CLI uses `defaultWiring` from
`@better-typescript/checks/preset/defaultWiring`.

A config may export any of these shapes:

```ts
export default wiring
export default () => wiring
export const wiring = wiring
export const wiring = () => wiring
```

The loaded value is structurally validated as the current `Wiring` shape:

```ts
{
  checks: ReadonlyArray<{
    name: string
    check: Check
    reported?: boolean
    examples?: ReadonlyArray<RefactorExample>
    paths?: ReadonlyArray<string>
  }>
  derive: (signals: ReadonlyArray<Signal>) => Stream.Stream<Advice, Error>
}
```

`reported` defaults to `true` when omitted in handwritten config objects.
`namedCheck(name, check, examples)` creates a reported `NamedCheck` with one or
more paired bad→good refactor examples; `silentCheck(name, check, examples?)`
creates a silent one. Reported checks print those examples under the Hint as
`Bad (path):` / `Good (path):` blocks (each file in the tree, code indented
four spaces). Names are unique across the whole `checks` array, and
`makeWiring` rejects duplicates. Config load, compile, shape, and duplicate
name failures print an error and exit `2`.

### Scoping checks to files and directories

Use `scopeCheck` to limit one `NamedCheck` without changing the other checks in
the wiring:

```ts
import { Stream, pipe } from "effect"
import {
  makeWiring,
  namedCheck,
  scopeCheck
} from "@better-typescript/core/engine/report"
import { noThrow, noThrowExamples } from "@better-typescript/checks/noThrow"

const serverNoThrow = pipe(
  namedCheck("no-throw", noThrow, noThrowExamples),
  scopeCheck(["src/server", "src/bootstrap.ts"])
)

export default makeWiring({
  checks: [serverNoThrow],
  derive: () => Stream.empty
})
```

Paths resolve from the TypeScript workspace root discovered from `--project` (or
the current directory). Each entry matches that exact file or directory and all
descendants; entries are paths, not glob patterns. Multiple entries form a
union. Scope filtering happens before check execution and again on emitted
detections, and applies equally to reported and silent checks in one-shot and
watch modes. Checks without `scopeCheck` (or with an empty `paths` array in a
handwritten config object) continue to run over every project file.

In this repository, preset checks load examples from disk with
`fixtureRefactorExamples("<kebab-name>")`, backed by real TypeScript trees at
`tests/fixtures/<kebab-name>/example/<n>/{bad,good}/` (each side is a
mini-project with its own `tsconfig.json`). Characterization fixtures stay
separate: `src/cases.ts` is the disallowed corpus and `src/allowed.ts` is
negative tests — not the "good" rewrite. Consumer configs should keep using
inline `exampleSnippet` / `refactorExample` (or `refactorExampleTrees`) as
shown below.

### Minimal custom check config

Put this at `<project-directory>/better-typescript.config.ts` to replace the
preset fleet with one local reported check:

```ts
import { Stream } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import type { Check } from "@better-typescript/core/engine/check/data"
import {
  detection,
  type Detection
} from "@better-typescript/core/engine/location"
import {
  exampleSnippet,
  refactorExample
} from "@better-typescript/core/engine/example"
import { makeWiring, namedCheck } from "@better-typescript/core/engine/report"

const isConsoleLogCall = (node: ts.CallExpression): boolean => {
  const expression = node.expression

  return (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === "console" &&
    expression.name.text === "log"
  )
}

const noConsoleLog: Check = nodeCheck([ts.SyntaxKind.CallExpression])(
  ts.isCallExpression
)((context) => {
  const element = detection(context)

  return (node): ReadonlyArray<Detection> =>
    isConsoleLogCall(node)
      ? [
          element({
            node,
            message: "Avoid console.log in runtime code.",
            hint: "Return data to the caller or use this project's structured logger at the boundary."
          })
        ]
      : []
})

const noConsoleLogExamples = [
  refactorExample(
    exampleSnippet("src/main.ts", `console.log("starting")`),
    exampleSnippet("src/main.ts", `return { status: "starting" as const }`)
  )
] as const

export default makeWiring({
  checks: [
    namedCheck("acme/no-console-log", noConsoleLog, noConsoleLogExamples)
  ],
  derive: () => Stream.empty
})
```

Checks see the program only: their input stream contains AST-node elements with
source file, program, and type-checker context. Checks should not read signals,
depend on derived advice, or create check-to-check dependencies.

### Opting into functional-core Effect architecture

The functional-core preset is intentionally separate from `defaultWiring`
because its rules encode project architecture, not universal TypeScript style.
It classifies files as `domain`, `port`, `application`, `adapter`, `root`, or
`test`; unclassified files are ignored. The default classifier recognizes those
directory names and common aliases such as `infrastructure`, `use-cases`, and
`entrypoints`, plus `main.ts`, `bootstrap.ts`, `wiring.ts`, `*.test.ts`, and
`*.spec.ts`.

Compose the preset with existing wiring so its reported boundary check and
silent shape evidence share the completed signal batch:

```ts
import { Stream, pipe } from "effect"
import { makeWiring } from "@better-typescript/core/engine/report"
import { defaultWiring } from "@better-typescript/checks/preset/defaultWiring"
import { functionalCoreEffectWiring } from "@better-typescript/checks/preset/functionalCoreEffectWiring"

export default makeWiring({
  checks: [...defaultWiring.checks, ...functionalCoreEffectWiring.checks],
  derive: (signals) =>
    pipe(
      defaultWiring.derive(signals),
      Stream.concat(functionalCoreEffectWiring.derive(signals))
    )
})
```

The boundary check enforces inward dependency direction, a pure domain, direct
capability access only in adapters/roots/tests, runtime execution and dependency
provisioning only at roots/tests, port/live-layer separation, infrastructure-free
port contracts, tag-based dependency access instead of context service
location, suspended adapter effects, scoped closeable resources, and service-owned
runtime state. Silent evidence derives file advice for overgrown Effect
orchestrators, business policy in adapters, thick composition roots, imperative
application cores, and unnecessary pure services.

API and module ownership is resolved through TypeScript symbols, including import
aliases, path mappings, first-party barrels, and re-exports. Locally shadowed
ambient names are ignored.

For layouts without the conventional directory names, use explicit
project-relative prefixes. The longest matching prefix wins:

```ts
import {
  ArchitectureRolePath,
  policyWithRolePrefixes
} from "@better-typescript/checks/functionalCoreEffect/policy"
import { makeFunctionalCoreEffectWiring } from "@better-typescript/checks/preset/functionalCoreEffectWiring"

const policy = policyWithRolePrefixes([
  new ArchitectureRolePath({ path: "src/model", role: "domain" }),
  new ArchitectureRolePath({ path: "src/contracts", role: "port" }),
  new ArchitectureRolePath({ path: "src/workflows", role: "application" }),
  new ArchitectureRolePath({ path: "src/integrations", role: "adapter" }),
  new ArchitectureRolePath({ path: "src/bootstrap", role: "root" }),
  new ArchitectureRolePath({ path: "tests", role: "test" })
])

export default makeFunctionalCoreEffectWiring(policy)
```

### Extending or cherry-picking the preset

To extend the built-in fleet, spread `defaultChecks` and add local `NamedCheck`
values. To cherry-pick, build a new `checks` array from `defaultChecks` or import
individual checks from `@better-typescript/checks/<name>` and omit the entries you
do not want. Never shadow a preset check by reusing its name; names are one
global lookup namespace.

Use `namedCheck` when the check should render local detection blocks. Use
`silentCheck` when it exists only to feed `derive`; it still runs, still
materializes a `Signal`, still participates in watch equality, and still remains
available through `signalOf(signals)(name)`.

```ts
import { Stream, pipe } from "effect"
import type { Detection } from "@better-typescript/core/engine/location"
import { Advice } from "@better-typescript/core/engine/derive/data"
import {
  adviceLocation,
  deriveSignals,
  evidenceItem
} from "@better-typescript/core/engine/derive"
import {
  makeWiring,
  signalOf,
  silentCheck,
  type NamedCheck,
  type Signal,
  type Wiring
} from "@better-typescript/core/engine/report"
import {
  defaultChecks,
  defaultDerive
} from "@better-typescript/checks/preset/defaultWiring"
import { noConsoleLog } from "./checks/noConsoleLog.js"

const countAtPath = (
  path: string,
  detections: ReadonlyArray<Detection>
): number =>
  detections.filter((element) => element.location.path === path).length

const detectionPaths = (
  detections: ReadonlyArray<Detection>
): ReadonlyArray<string> =>
  Array.from(new Set(detections.map((element) => element.location.path))).sort()

const consoleLogAdvice = (
  detections: Stream.Stream<Detection, Error>
): Stream.Stream<Advice, Error> =>
  deriveSignals((elements: ReadonlyArray<Detection>) =>
    detectionPaths(elements).map(
      (path) =>
        new Advice({
          location: adviceLocation(path),
          level: "file",
          title: "console logging in runtime code",
          remediation:
            "Replace console.log with the project's structured logger or return data to the caller.",
          evidence: [
            evidenceItem("console.log calls", countAtPath(path, elements))
          ]
        })
    )
  )(detections)

const consoleLogEvidence: NamedCheck = silentCheck(
  "acme/console-log-evidence",
  noConsoleLog
)

const wiring: Wiring = makeWiring({
  checks: [...defaultChecks, consoleLogEvidence],
  derive: (signals: ReadonlyArray<Signal>): Stream.Stream<Advice, Error> => {
    const elementsOf = signalOf(signals)
    const presetAdvice = defaultDerive(signals)
    const localAdvice = consoleLogAdvice(
      elementsOf("acme/console-log-evidence")
    )

    return pipe(presetAdvice, Stream.concat(localAdvice))
  }
})

export default wiring
```

`derive` consumes a completed signal array, not live upstream streams. Missing
names yield `Stream.empty`, so renaming a check is a breaking change for every
derivation lookup that asks for that name. Compose derived output with Effect
`Stream` combinators. Use `withFallbackAdvice(specific, fallback)` when fallback
file-level advice should appear only for files where no file-level specific
advice fired; it materializes the specific stream once, emits specific advice
first, and filters fallback file advice for already-covered files.

`examples/extend-preset/better-typescript.config.ts` contains a complete
copyable config that extends the preset from an examples subtree. The CLI will
not load it while self-hosting this repository because config resolution only
checks the direct `--project` / current-working-directory root.

### Exit codes

- `0`: the one-shot report completed, or the watch stream ran until it was
  ended with Ctrl-C.
- `2`: the tool could not start, for example because the project path,
  TypeScript configuration, or `Wiring` config is invalid.

## Non-goals

Better TypeScript intentionally does not provide:

- Dynamic plugin discovery or config strings resolved to packages at runtime.
- Suppression comments, severity levels, or per-check configuration.
- A replacement for `tsc`, ESLint, or Prettier.
- Automatic code formatting.
- A generated style-guide subcommand.

## Analysis modes

The default CLI path is a terminating snapshot run. It loads the project once,
runs every configured check over one snapshotted AST-node stream, materializes a
complete `Signal[]`, runs `derive(signals)`, projects the resulting report blocks
to `ReportEvent`s, prints them as NDJSON or `--pretty` text, and exits `0` after
stdout drains. The initial event projection is the same as the first batch of
watch mode: either one `signal` event per visible report block or one `empty`
event when there are no signals.

`--watch` opts into the continuous pipeline. Watch mode uses
`ts.createWatchProgram`-backed streams: one fresh program context per rebuild,
diffed by `ts.SourceFile` identity into changed and removed files. The pipeline
is source updates → check signals → derived advice and report blocks → per-block
delta events, where every element carries one consistent batch and change gates
between stages keep quiet batches silent. Checks recompute in full inside each
batch, so detection sets always match what a fresh snapshot report would compute
for the current programs. Silent checks participate in signal equality; only
`reported` controls whether their local detections render.

The snapshot `reportFromWiring` runner remains public library surface for tests,
benchmarks, and programmatic one-shot use. The `watchReportFromWiring` runner
remains the generic watch runner used by `--watch`.

Watch-mode caveat: membership changes in a solution-style root tsconfig's
reference list need a restart. Each leaf project's own tsconfig hot-reloads.
Mid-run tsconfig breakage is tolerated silently — the watcher keeps the last
good program and recovers when the config is fixed.

## Source topology

Source checks and derivation helpers live under `src/checks/`. Execution,
reporting, watch, source-loading, location, and TypeScript-schema infrastructure
live under `src/engine/`. The public entrypoints remain the package exports;
source paths are implementation details for maintainers.

## Architecture notes

- `adrs/0011-rules-and-advice-are-one-concept.md` records the current check,
  signal, `reported`, and `derive` architecture. It supersedes ADR-0009's wiring
  shape and separate visibility categories while preserving explicit reviewed
  TypeScript configuration.
- `adrs/0010-one-shot-default-watch-opt-in.md` records the current CLI mode
  decision: one-shot by default, `--watch` for continuous deltas. ADR-0011
  preserves that wire behavior.
- `adrs/0008-ndjson-event-output.md` records the NDJSON-by-default output
  decision and the event schema. ADR-0011 preserves its event tags, report-key
  shapes, rendering order, and pretty-output projection.
- `adrs/0009-user-fleets-are-report-wiring.md` remains historical context for
  one root TypeScript config, no discovery, no hot reload, and no plugin
  registry. ADR-0011 supersedes its public wiring shape.
- `adrs/0007-continuous-watch-analysis.md` records the watch pipeline and its
  change gates; its continuous-only/default claim is superseded by ADR-0010.
- `adrs/0006-detection-is-streams-and-functions.md` records the direct
  Effect-stream/function ontology that ADR-0011 preserves: no registry,
  scheduler, ids, roles, severities, suppressions, or dependency metadata.
- `adrs/0003-detectors-over-a-stratified-containment-tree.md` and
  `adrs/0005-detector-fleets-are-user-code.md` are superseded where they depend
  on identity metadata, category labels, generated guides, or structured reports.
