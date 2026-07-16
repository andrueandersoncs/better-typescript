# Better TypeScript

Better TypeScript is a TypeScript analysis CLI for coding agents. It uses the official `typescript`
package to inspect source files and type information, emit actionable signals to stdout, and exit by
default. Output is one NDJSON event per line unless `--pretty` projects the same events into
human-readable text blocks. `--watch` opts into continuous analysis as files change.

## Goal

Better TypeScript's end users are **coding agents**. The useful output is not a long checklist of
local style nits; it is the smallest instruction that moves the code toward the shape this project
enforces.

The architecture is intentionally plain:

- A `Check` analyzes TypeScript source and emits located `Detection` values.
- A `NamedCheck` carries one Check's stable name, reporting policy, and lazy refactor examples.
- A `Wiring` selects NamedChecks and derives aggregate `Advice` from their completed `Signal`
  values.
- Reported Signals render local blocks; silent Signals remain available to derivation without a
  local block.
- `reportEvents` turns complete Workspace Updates into the event stream consumed by the CLI.

There are no suppressions, severities, or result-based exit gate. The `files` globs on each config
entry limit which source files its complete `Wiring` analyzes. If a signal appears, fix the cause in
the code.

## What the CLI does

1. Discovers the TypeScript project from its `tsconfig.json`.
2. Loads the project's `WiringConfig` from `better-typescript.config.ts` or the built-in preset.
3. By default, analyzes the current snapshot once, emits the initial report, and exits `0`.
4. With `--watch`, starts a TypeScript watch program per leaf project, emits the same initial
   report, then stays alive and pushes only what changed:
   - a block re-emits as a `signal` event whenever its content changes;
   - a block that disappears emits one `cleared` event;
   - a rebuild with no visible change emits nothing.

Aggregate advice blocks lead when they explain a broader shape, such as an imperative state manager,
a pipeline-hostile module, a hot subsystem, or systemic hotspots. Reported check blocks render their
local detection locations after the aggregate advice.

### Output format

By default stdout is NDJSON: one JSON event per line. There are three event shapes, discriminated by
`_tag`:

```json
{"_tag":"signal","key":{"_tag":"rule","name":"no-throw","message":"Avoid throwing errors with throw.","hint":"Create a custom error with Schema.TaggedErrorClass..."},"text":"no-throw\n  Avoid throwing errors with throw.\n  Hint: ...\n  src/cases.ts:4:3"}
{"_tag":"cleared","key":{"_tag":"rule","name":"no-throw","message":"Avoid throwing errors with throw.","hint":"Create a custom error with Schema.TaggedErrorClass..."},"text":"no-throw — cleared: Avoid throwing errors with throw."}
{"_tag":"empty","rootPath":"/path/to/project"}
```

- `signal` — a report block appeared or its content changed; `text` is the full rendered block. The
  default one-shot run emits one `signal` per initial report block.
- `cleared` — a previously emitted block disappeared; `text` is its one cleared line. Only `--watch`
  can emit `cleared` events because one-shot runs have no previous report state.
- `empty` — the initial report found no signals. A one-shot run emits exactly one `empty` event when
  the snapshot is signal-free.

`key` is the block's stable identity across events. Local detection keys still serialize as
`{ _tag: "rule", name, message, hint }`; aggregate advice keys still serialize as
`{ _tag: "advice", level, path, title }`. Those two tag names are wire-format compatibility forms
only. Internally, checks and derived `Advice` are the current model.

With `--pretty`, the CLI renders the same events as human-readable text blocks instead (each block
followed by a blank line; the empty report prints `No signals in /path/to/project.`). Any remaining
local/aggregate pretty-block vocabulary historically described as rule/advice output is presentation
compatibility only, just like the NDJSON key tags.

Status lines go to stderr; stdout carries only the event stream. The default one-shot status is
`Analyzing /path/to/project.`. The watch status is `Watching /path/to/project for changes.`. Capture
or filter stdout by piping:

```sh
better-typescript | tee report.ndjson
better-typescript | jq -r 'select(._tag == "signal") | .text'
```

## Usage

```sh
better-typescript
```

By default, the CLI analyzes the current working directory once and exits after printing the initial
report.

### Link this checkout into another project

Register the repository's `better-typescript` binary from this checkout, then link it into the
consuming project:

```sh
# In this repository
npm link

# In the consuming project
npm link better-typescript
better-typescript --pretty
```

The first `npm link` runs the repository's `prepare` script and builds the CLI. Run `npm run build`
after later source changes so the linked binary uses fresh `dist` output. Remove the consumer link
with `npm unlink better-typescript`.

### Options

- `--project <directory>`: analyze a specific project directory instead of the current working
  directory. Config is resolved directly under this directory.
- `--pretty`: render human-readable text blocks instead of NDJSON events.
- `--watch`: keep running after the initial report, watch TypeScript project changes, and emit
  changed/cleared deltas.

## Packages

This repository is an npm workspaces monorepo:

- `@better-typescript/core` — analysis kernel (`engine/*`, `project/*`)
- `@better-typescript/checks` — built-in checks and default preset wiring
- `@better-typescript/cli` — `better-typescript` binary

## Configuration and extension

Better TypeScript exposes one intentional public interface per Module through package exports.
Re-exporting is valid when an entry module is that seam; callers must not bypass it through package
`src/` or `internal/` paths.

### Public package surface

| Import                                                       | Primary public role                                                                                                                                                                                                                                  |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@better-typescript/core/engine/check`                       | Low-level `nodeCheck`, `fileCheck`, `checkFromSubscriptions`, subscription, location, and detection authoring primitives                                                                                                                             |
| `@better-typescript/core/engine/check/data`                  | `Check`, `CheckContext`, `DetectionSource`, and subscription types                                                                                                                                                                                   |
| `@better-typescript/core/engine/location`                    | Detection grouping, equality, and path helpers                                                                                                                                                                                                       |
| `@better-typescript/core/engine/location/data`               | `Detection` and `Location`                                                                                                                                                                                                                           |
| `@better-typescript/core/engine/derive`                      | Advice derivation helpers                                                                                                                                                                                                                            |
| `@better-typescript/core/engine/derive/data`                 | `Advice` and evidence vocabulary                                                                                                                                                                                                                     |
| `@better-typescript/core/engine/example`                     | Refactor-example constructors and source-tree loading                                                                                                                                                                                                |
| `@better-typescript/core/engine/example/data`                | Refactor-example data types                                                                                                                                                                                                                          |
| `@better-typescript/core/engine/wiring`                      | `namedCheck`, `silentCheck`, `makeWiring`, `mergeWirings`, `defineConfig`                                                                                                                                                                            |
| `@better-typescript/core/engine/wiring/data`                 | `NamedCheck`, `Wiring`, `WiringEntry`, `WiringConfig`                                                                                                                                                                                                |
| `@better-typescript/core/engine/signal`                      | `signalOf` and Signal-level composition                                                                                                                                                                                                              |
| `@better-typescript/core/engine/signal/data`                 | The `Signal` result vocabulary                                                                                                                                                                                                                       |
| `@better-typescript/core/engine/report`                      | Report rendering, including `withFallbackAdvice` and `renderEventText`                                                                                                                                                                               |
| `@better-typescript/core/engine/report/data`                 | `ReportEvent`, `SignalEvent`, `ClearedEvent`, and `EmptyReportEvent` wire vocabulary                                                                                                                                                                 |
| `@better-typescript/core/engine/watch`                       | `reportEvents` composition and the production `workspaceUpdates` adapter                                                                                                                                                                             |
| `@better-typescript/core/engine/watch/data`                  | The `WorkspaceUpdate` input contract                                                                                                                                                                                                                 |
| `@better-typescript/core/engine/sources`                     | Program/source execution helpers                                                                                                                                                                                                                     |
| `@better-typescript/core/engine/sources/data`                | Program and source context types                                                                                                                                                                                                                     |
| `@better-typescript/core/project/loadProject`                | `discoverWorkspace`, `loadProjectConfig`, `contextFromLoadedProject`, `workspaceSignalsFromConfigs`, `runCheckOnProject`, `loadProject`                                                                                                              |
| `@better-typescript/core/project/loadProject/data`           | Discovered and loaded project/workspace types and project-loading errors                                                                                                                                                                             |
| `@better-typescript/core/project/loadWiringConfig`           | Project config loading                                                                                                                                                                                                                               |
| `@better-typescript/core/project/loadWiringConfig/data`      | `ProjectWiringConfigError` and config-loading vocabulary                                                                                                                                                                                             |
| `@better-typescript/checks/defineCheck`                      | Built-in `defineCheck`, `defineFileCheck`, `definePlannedCheck`, `defineSilentPlannedCheck` authoring                                                                                                                                                |
| `@better-typescript/checks/preset`                           | `report`, the default-config Workspace Update-to-Report Event composition                                                                                                                                                                            |
| `@better-typescript/checks/preset/defaultWiring`             | `defaultChecks`, `defaultDerive`, `defaultWiring`, `defaultConfig`                                                                                                                                                                                   |
| `@better-typescript/checks/preset/architectureExploreWiring` | `architectureExploreCoreChecks`, `architectureExploreOopChecks`, `architectureExploreFpChecks`, `architectureExploreChecks`, `architectureExploreDerive`, `architectureExploreWiring`, `architectureExploreOopWiring`, `architectureExploreFpWiring` |
| `@better-typescript/checks/<name>`                           | One package-owned built-in `NamedCheck`                                                                                                                                                                                                              |
| `@better-typescript/checks/functionalCoreEffect/wiring`      | Opt-in functional-core boundary Checks, derived advice, and wiring factories                                                                                                                                                                         |
| `@better-typescript/checks/functionalCoreEffect/policy`      | Architecture-role and capability/resource policy configuration                                                                                                                                                                                       |

### Config resolution

The CLI looks for exactly one config file:

```text
<project-directory>/better-typescript.config.ts
```

`<project-directory>` is the `--project` value when supplied, otherwise the current working
directory. The config file is loaded with `jiti`, so normal TypeScript config modules work with the
published Node bin. There is no parent-directory lookup, `package.json` field, `extends` chain, or
dynamic plugin discovery.

If no config file exists, the CLI uses `defaultConfig` from
`@better-typescript/checks/preset/defaultWiring`. A config may default-export a `WiringConfig` or a
zero-argument factory, or expose either as the named `config` export. A bare `Wiring` and the legacy
named `wiring` export are invalid.

`WiringConfig` is an ordered array of `{ files, wiring }` entries. `files` is a non-empty set of
workspace-relative globs; `wiring` contains `NamedCheck` values and one derive function. Use
`defineConfig` to construct and validate it. Check names are unique across all entries; config load,
compile, glob, shape, and duplicate-name failures print an error and exit `2`.

### Built-in checks own their identity and examples

Every individual module in `@better-typescript/checks/<name>` exports a `NamedCheck`, not a raw
Check that consumers must register. Its stable name, reporting policy, executable Check, and lazy
examples travel together, so it can be placed directly in a `Wiring`:

```ts
import { Stream } from "effect"
import { defineConfig, makeWiring } from "@better-typescript/core/engine/wiring"
import { noThrow } from "@better-typescript/checks/noThrow"

const runtimeWiring = makeWiring({
  checks: [noThrow],
  derive: () => Stream.empty
})

export default defineConfig([
  {
    files: ["src/**/*.{ts,tsx}", "packages/*/src/**/*.ts"],
    wiring: runtimeWiring
  }
])
```

`files` uses Minimatch syntax, including `*`, `**`, `?`, character classes, brace expansion, and
extglobs. Patterns use `/` on every platform and resolve from the discovered TypeScript workspace
root. Dotfiles participate, patterns in one entry form a union, and all overlapping entries run.
Patterns are positive; leading `!` is literal.

Glob filtering applies to the complete Wiring, including derivation. A wiring with no matching
source file runs neither Checks nor `derive`. Each matched wiring receives its own completed
`Signal[]`; advice derived from that already-filtered evidence is not filtered a second time.

Built-in refactor examples are package assets at
`packages/checks/examples/<name>/<pair>/{bad,good}/`. The built-in authoring constructors associate
those trees with the Check lazily and memoize the first load, so constructing the default fleet does
not read every example. Reports render each source tree as paired `Bad (path):` and `Good (path):`
blocks.

The separate characterization corpus stays under `tests/fixtures/<name>/`. A `// ~detect <columns>`
marker on a fixture line declares its expected detection columns; unmarked lines must remain clean.
Tests call the exported `NamedCheck`, so names and behavior are not mirrored in test registration.
Comment-, whitespace-, or other syntax-sensitive/custom cases retain exact assertions only when
adding a marker would change the Check's input or a location marker cannot express the contract.

### Minimal custom check config

Consumer Checks continue to use the core primitives. Put this at
`<project-directory>/better-typescript.config.ts` to replace the preset with one local reported
Check:

```ts
import { Stream } from "effect"
import * as ts from "typescript"
import { detection, nodeCheck } from "@better-typescript/core/engine/check"
import type { Check } from "@better-typescript/core/engine/check/data"
import { exampleSnippet, refactorExample } from "@better-typescript/core/engine/example"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { defineConfig, makeWiring, namedCheck } from "@better-typescript/core/engine/wiring"

const isConsoleLogCall = (node: ts.CallExpression): boolean => {
  const expression = node.expression

  return (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === "console" &&
    expression.name.text === "log"
  )
}

const noConsoleLog: Check = nodeCheck([ts.SyntaxKind.CallExpression])(ts.isCallExpression)(
  (context) => {
    const makeDetection = detection(context)

    return (node): ReadonlyArray<Detection> =>
      isConsoleLogCall(node)
        ? [
            makeDetection({
              node,
              message: "Avoid console.log in runtime code.",
              hint: "Return data to the caller or use this project's structured logger at the boundary."
            })
          ]
        : []
  }
)

const noConsoleLogExamples = () =>
  [
    refactorExample(
      exampleSnippet("src/main.ts", `console.log("starting")`),
      exampleSnippet("src/main.ts", `return { status: "starting" as const }`)
    )
  ] as const

const localWiring = makeWiring({
  checks: [namedCheck("acme/no-console-log", noConsoleLog, noConsoleLogExamples)],
  derive: () => Stream.empty
})

export default defineConfig([{ files: ["src/**/*.ts"], wiring: localWiring }])
```

Use `nodeCheck`, `fileCheck`, or `checkFromSubscriptions` to build custom Check behavior. Wrap it
with `namedCheck` when detections should render locally or `silentCheck` when it exists only to feed
derivation. Custom examples are lazy thunks built with `exampleSnippet`, `refactorExample`, or
`refactorExampleTrees`.

### Composing and cherry-picking Wiring

`mergeWirings` composes whole Wiring values: it preserves check order and runs every member's derive
function over the completed Signal batch. Do not spread check arrays and reconstruct derivation by
hand. For example, opt into the functional-core fleet alongside the default preset with:

```ts
import { defineConfig, mergeWirings } from "@better-typescript/core/engine/wiring"
import { functionalCoreEffectWiring } from "@better-typescript/checks/functionalCoreEffect/wiring"
import { defaultWiring } from "@better-typescript/checks/preset/defaultWiring"

const wiring = mergeWirings([defaultWiring, functionalCoreEffectWiring])

export default defineConfig([{ files: ["**/*"], wiring }])
```

To extend the preset with the `localWiring` above, use `mergeWirings([defaultWiring, localWiring])`.
To cherry-pick built-ins, import their ready-made `NamedCheck` values and place them directly in a
new Wiring:

```ts
import { Stream } from "effect"
import { defineConfig, makeWiring } from "@better-typescript/core/engine/wiring"
import { noThrow } from "@better-typescript/checks/noThrow"
import { noTryCatch } from "@better-typescript/checks/noTryCatch"

const selectedWiring = makeWiring({
  checks: [noThrow, noTryCatch],
  derive: () => Stream.empty
})

export default defineConfig([{ files: ["**/*"], wiring: selectedWiring }])
```

Do not rename or re-register built-ins. Check names form one global namespace across the complete
config, so merging the same built-in twice is an error.

`derive` consumes a completed Signal array, not live upstream streams. Import `signalOf` from
`@better-typescript/core/engine/signal` to select a Check's detections and compose Advice with
Effect `Stream` combinators. Import `withFallbackAdvice` from
`@better-typescript/core/engine/report` when file-level fallback Advice should be suppressed for
files already covered by specific Advice.

The functional-core preset is separate from `defaultWiring` because it encodes project architecture,
not universal TypeScript style. It classifies conventional `domain`, `port`, `application`,
`adapter`, `root`, and `test` paths; explicit role prefixes and capability/resource policy are
available from its policy subpath.

`examples/extend-preset/better-typescript.config.ts` contains a complete copyable consumer config.
Config resolution does not discover examples subtrees while this repository self-hosts.

### Opting into an architecture paradigm

Architecture Explore is split by paradigm so end-users opt in explicitly. Core evidence
(`pass-through-wrappers`, `interface-burden`, `module-graph`, `test-only-exports`,
`seam-leakage-evidence`, `import-usage`, `module-identity`, `export-surface`) is paradigm-neutral.
OOP adds `external-dependency-construction` and `single-adapter-seams`. FP adds
`composition-forwarders`, `module-scope-effects`, `context-tag-seams`, and
`composition-fingerprints`. One shared `architectureExploreDerive` tolerates absent evidence from
either paradigm set.

Wire `architectureExploreOopWiring` (core+oop) or `architectureExploreFpWiring` (core+fp) for a
single paradigm. `architectureExploreWiring` is the union and remains the back-compat entry when a
project mixes both:

```ts
import { defineConfig, mergeWirings } from "@better-typescript/core/engine/wiring"
import { defaultWiring } from "@better-typescript/checks/preset/defaultWiring"
import { architectureExploreOopWiring } from "@better-typescript/checks/preset/architectureExploreWiring"

const wiring = mergeWirings([defaultWiring, architectureExploreOopWiring])

export default defineConfig([{ files: ["**/*"], wiring }])
```

Replace `architectureExploreOopWiring` with `architectureExploreFpWiring` for the FP fleet, or with
`architectureExploreWiring` when both paradigms apply.

### Exit codes

- `0`: the one-shot report completed, or the watch stream ran until it was ended with Ctrl-C.
- `2`: the tool could not start, for example because the project path, TypeScript configuration, or
  `WiringConfig` is invalid.

## Non-goals

Better TypeScript intentionally does not provide:

- Dynamic plugin discovery or config strings resolved to packages at runtime.
- Suppression comments, severity levels, or per-check configuration.
- A replacement for `tsc`, ESLint, or Prettier.
- Automatic code formatting.
- A generated style-guide subcommand.

## Analysis modes

`workspaceUpdates(workspace, watchOptions)` is the production adapter from a discovered workspace to
a `Stream<WorkspaceUpdate>`. `reportEvents(config)(updates)` is the public report composition from
that stream to `Stream<ReportEvent>`. Programmatic callers and tests can provide synthetic Workspace
Updates directly without replacing the compiler or importing pipeline stages.

The CLI constructs the producer once and selects only how much of it to consume:

```ts
const updates = workspaceUpdates(workspace, watchOptions)
const selectedUpdates = watchForChanges ? updates : Stream.take(updates, 1)
const events = reportEvents(config)(selectedUpdates)
```

The default one-shot path therefore takes the first complete workspace snapshot, emits its report,
and exits after stdout drains. `--watch` consumes the same producer continuously. Both modes share
glob activation, fused Check execution, full batch recomputation, derivation, rendering, empty
reports, and report-event deltas. The initial batch emits one `signal` event per visible block or
one `empty` event; later watch batches emit changed `signal` and disappeared `cleared` events only.

Watch-mode caveat: membership changes in a solution-style root tsconfig's reference list need a
restart. Each leaf project's own tsconfig hot-reloads. Mid-run tsconfig breakage is tolerated
silently—the watcher keeps the last good program and recovers when the config is fixed.

Workspace evidence for Architecture Explore walks the root `tsconfig.json` project references. Test
projects must be referenced for test-aware Advice; otherwise the fleet emits project-level
`invisible tests` rather than silently omitting test evidence. Evidence paths are
workspace-relative. Cross-package caller joins happen in `derive` by matching `import-usage`
specifiers to `module-identity` aliases — no extra Programs.

## Source topology

The repository is split into the core analysis package, built-in Checks package, and CLI package.
Within core, wiring owns identity/configuration/composition, signal owns completed Check results,
report owns rendering and wire vocabulary, and watch owns Workspace Update production and Workspace
Update-to-Report Event composition. Project loading remains a separate boundary. Public package
exports are the supported entrypoints; source paths are implementation details.

## Architecture notes

- `adrs/0019-workspace-update-report-seam.md` records the Workspace Update stream seam, shared
  one-shot/watch report composition, focused project-loading surface, whole-Wiring composition, and
  module ownership.
- `adrs/0018-check-owned-authoring-and-package-examples.md` records complete built-in `NamedCheck`
  exports, package-owned lazy examples, direct preset enrollment, and marker-driven
  characterization.
- `adrs/0017-paradigm-split-architecture-fleets.md` records the Architecture Explore core/OOP/FP
  split, shared derive, workspace evidence horizon, and invisible-tests diagnostic.
- `adrs/0016-single-line-comments-only.md` records the comment policy: isolated single-line comments
  only, a universal because requirement, a 100-character cap, and concept rationale read from
  leading line comments instead of JSDoc.
- `adrs/0015-glob-specific-wiring-configuration.md` records the flat, glob-matched `WiringConfig`,
  arbitrary wiring-entry cardinality, and removal of per-check path scoping. ADR-0017 supersedes
  only its public runner naming clause.
- `adrs/0014-interface-depth-and-seam-evidence.md` records the evidence model for module leverage,
  locality, seam placement, and testability.
- `adrs/0013-fused-dispatch-and-bounded-workspaces.md` records declarative Check plans, fused
  `SyntaxKind` dispatch, stack-safe traversal, and bounded one-project-at-a-time workspace analysis.
  ADR-0016 supersedes its built-in authoring consequence; ADR-0017 preserves its execution and
  workspace decisions behind the new stream seam.
- `adrs/0012-monorepo-core-checks-cli.md` records the split into core, checks, and CLI workspace
  packages. ADR-0016 supersedes only its fixture location and loader consequence.
- `adrs/0011-rules-and-advice-are-one-concept.md` records the unified Check, Signal, `reported`, and
  `derive` vocabulary. ADR-0013 supersedes its Check execution representation, not those concepts.
- `adrs/0010-one-shot-default-watch-opt-in.md` records the CLI mode decision: one-shot by default,
  `--watch` for continuous deltas.
- `adrs/0008-ndjson-event-output.md` records the NDJSON-by-default output decision and event schema.
  Later ADRs preserve its event tags, report-key shapes, rendering order, and pretty projection.
- `adrs/0009-user-fleets-are-report-wiring.md` remains historical context for one root TypeScript
  config, no discovery, no hot reload, and no plugin registry. ADR-0011 supersedes its public wiring
  shape.
- `adrs/0007-continuous-watch-analysis.md` records consistent workspace batches, full recomputation,
  and change gates. ADR-0010 supersedes its continuous-only default, ADR-0013 supersedes its
  materialized AST cache, and ADR-0017 preserves the remaining decisions through Workspace Updates.
- `adrs/0006-detection-is-streams-and-functions.md` remains historical context for stream-based
  derivation and reporting. ADR-0013 supersedes its independent Check streams; its rejection of
  registries, schedulers, ids, roles, severities, suppressions, and dependency metadata remains.
- `adrs/0003-detectors-over-a-stratified-containment-tree.md` and
  `adrs/0005-detector-fleets-are-user-code.md` are superseded where they depend on identity
  metadata, category labels, generated guides, or structured reports.
