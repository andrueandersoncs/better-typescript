# Better TypeScript

Better TypeScript is a TypeScript analysis CLI for coding agents. It uses the
official `typescript` package to inspect source files and type information,
emit architectural advice to stdout, and exit by default. Output is one NDJSON
event per line unless `--pretty` projects the same events into human-readable
text blocks. `--watch` opts into continuous analysis as files change.

## Goal

Better TypeScript's end users are **coding agents**. The useful output is not a
long checklist of local style nits; it is the smallest instruction that moves
the code toward the shape this project enforces.

The architecture is intentionally plain:

- A detector is any function that produces an Effect `Stream`.
- The stream is the signal.
- Rules see the program: loaded source text, AST nodes, and type information.
- Advice sees signals: it folds over rule streams and other advice streams.
- The CLI prints the events emitted by the leaf streams of the graph.

There are no suppressions, severities, per-rule options, or result-based exit
gate. If a signal appears, fix the cause in the code.

## What the CLI does

1. Discovers the TypeScript project from its `tsconfig.json`.
2. Loads the project's `ReportWiring` from `better-typescript.config.ts` or the
   built-in preset.
3. By default, analyzes the current snapshot once, emits the initial report, and
   exits `0`.
4. With `--watch`, starts a TypeScript watch program per leaf project, emits the
   same initial report, then stays alive and pushes only what changed:
   - a block re-emits as a `signal` event whenever its content changes;
   - a block that disappears emits one `cleared` event;
   - a rebuild with no visible change emits nothing.

Advice blocks lead when they explain a broader shape, such as an imperative
state manager, a pipeline-hostile module, a hot subsystem, or systemic hotspots.
Rule blocks still render their locations.

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

`key` is the block's stable identity across events. Rule keys carry
`{ _tag: "rule", name, message, hint }`; advice keys carry
`{ _tag: "advice", level, path, title }`.

With `--pretty`, the CLI renders the same events as human-readable text blocks
instead (each block followed by a blank line; the empty report prints
`No signals in /path/to/project.`).

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

## Configuration and extension

Better TypeScript has two public import boundaries:

- `better-typescript` is the **kernel**. It exports the authoring and
  composition surface: `RuleCheck`, `nodeCheck`, `fileCheck`, `detection`,
  `locateNode`, `AdviceElement`, `ReportWiring`, `namedRuleCheck`,
  `makeWiring`, `ruleSignal`, `withFallbackAdvice`,
  `reportFromWiring`, and `watchReportFromWiring`.
- `better-typescript/preset` is the built-in fleet. It exports `rules`,
  `advice`, `reportedRules`, `helperRules`, `defaultAdvice`,
  `defaultWiring`, and default `report` / `watchReport` runners.

Do not import from `better-typescript/src/...`; the package entrypoints are the
public boundary.

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
`better-typescript/preset`.

A config may export any of these shapes:

```ts
export default wiring
export default () => wiring
export const wiring = wiring
export const wiring = () => wiring
```

The loaded value is structurally validated as:

```ts
{
  rules: ReadonlyArray<{ name: string; check: RuleCheck }>
  helpers: ReadonlyArray<{ name: string; check: RuleCheck }>
  advice: (rules: ReadonlyArray<RuleSignals>, helpers: ReadonlyArray<RuleSignals>) =>
    Stream.Stream<AdviceElement, Error>
}
```

`makeWiring` rejects duplicate names inside `rules` and inside `helpers`.
Rule names and helper names are validated separately; using the same prose name
in both arrays is allowed but discouraged because advice receives separate rule
and helper signal lists. Config load, compile, shape, and duplicate-name
failures print an error and exit `2`.

### Minimal custom rule config

Put this at `<project-directory>/better-typescript.config.ts` to replace the
preset fleet with one local rule:

```ts
import { Stream } from "effect"
import * as ts from "typescript"
import {
  detection,
  makeWiring,
  namedRuleCheck,
  nodeCheck
} from "better-typescript"
import type { Detection, RuleCheck } from "better-typescript"

const isConsoleLogCall = (node: ts.CallExpression): boolean => {
  const expression = node.expression

  return (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === "console" &&
    expression.name.text === "log"
  )
}

const noConsoleLog: RuleCheck = nodeCheck([ts.SyntaxKind.CallExpression])(
  ts.isCallExpression
)((context) => {
  const element = detection(context)

  return (node): ReadonlyArray<Detection> =>
    isConsoleLogCall(node)
      ? [
          element({
            node,
            message: "Avoid console.log in runtime code.",
            hint:
              "Return data to the caller or use this project's structured logger at the boundary."
          })
        ]
      : []
})

export default makeWiring({
  rules: [namedRuleCheck("acme/no-console-log", noConsoleLog)],
  helpers: [],
  advice: () => Stream.empty
})
```

Rules see the program only: their input stream contains AST-node elements with
source file, program, and type-checker context. Rules should not read other
rules' output, depend on advice, or create rule-to-rule dependencies.

### Extending or cherry-picking the preset

To extend the built-in fleet, spread the preset arrays and add your named
checks. To cherry-pick, build new arrays from the exported preset entries and
omit the ones you do not want. Never shadow a preset rule by reusing its name;
`makeWiring` rejects duplicate names in the same layer.

```ts
import { Stream, pipe } from "effect"
import {
  AdviceElement,
  adviceLocation,
  deriveSignals,
  evidenceItem,
  makeWiring,
  namedRuleCheck,
  ruleSignal
} from "better-typescript"
import type { Detection } from "better-typescript"
import { defaultWiring } from "better-typescript/preset"
import { noConsoleLog } from "./rules/noConsoleLog.js"

const localRule = namedRuleCheck("acme/no-console-log", noConsoleLog)

const consoleLogAdvice = (
  detections: Stream.Stream<Detection, Error>
): Stream.Stream<AdviceElement, Error> =>
  deriveSignals((elements) =>
    elements.length === 0
      ? []
      : [
          new AdviceElement({
            location: adviceLocation("project"),
            level: "project",
            title: "console logging in runtime code",
            remediation:
              "Replace ad-hoc console output with the project's runtime boundary logging.",
            evidence: [evidenceItem("console.log calls", elements.length)]
          })
        ]
  )(detections)

export default makeWiring({
  rules: [...defaultWiring.rules, localRule],
  helpers: defaultWiring.helpers,
  advice: (ruleSignals, helperSignals) => {
    const elementsOf = ruleSignal(ruleSignals)
    const presetAdvice = defaultWiring.advice(ruleSignals, helperSignals)
    const localAdvice = consoleLogAdvice(elementsOf("acme/no-console-log"))

    return pipe(presetAdvice, Stream.concat(localAdvice))
  }
})
```

Advice consumes signals by prose name through `ruleSignal`. Missing names yield
`Stream.empty`, so renaming a rule is a breaking change for advice that asks for
that name. Helpers are named rule checks in `helpers`: they run over the same
AST stream as rules and are visible to advice through the second
`helperSignals` argument, but they do not render rule report blocks.

Use `withFallbackAdvice(specific, fallback)` when fallback file-level advice
should appear only for files where no file-level specific advice fired. It
materializes the specific stream once, emits specific advice first, and filters
fallback file advice for already-covered files. Direct composition with Effect
`Stream` combinators is appropriate when the advice streams should all emit.

`examples/extend-preset/better-typescript.config.ts` contains a complete
copyable config that extends the preset from an examples subtree. The CLI will
not load it while self-hosting this repository because config resolution only
checks the direct `--project` / current-working-directory root.

### Exit codes

- `0`: the one-shot report completed, or the watch stream ran until it was
  ended with Ctrl-C.
- `2`: the tool could not start, for example because the project path,
  TypeScript configuration, or `ReportWiring` config is invalid.

## Non-goals

Better TypeScript intentionally does not provide:

- Dynamic plugin discovery or config strings resolved to packages at runtime.
- Suppression comments, severity levels, or per-rule configuration.
- A replacement for `tsc`, ESLint, or Prettier.
- Automatic code formatting.
- A generated style-guide subcommand.

## Analysis modes

The default CLI path is a terminating snapshot run. It loads the project once,
runs the configured `ReportWiring` over that snapshot, projects the initial
report blocks to `ReportEvent`s, prints them as NDJSON or `--pretty` text, and
exits `0` after stdout drains. The initial event projection is the same as the
first batch of watch mode: either one `signal` event per report block or one
`empty` event when there are no signals.

`--watch` opts into the continuous pipeline. Watch mode uses
`ts.createWatchProgram`-backed streams: one fresh program context per rebuild,
diffed by `ts.SourceFile` identity into changed and removed files. The pipeline
is source updates → signal batches → advice and report blocks → per-block delta
events, where every element carries one consistent batch and change gates
between stages keep quiet batches silent. Rules recompute in full inside each
batch, so detection sets always match what a fresh snapshot report would compute
for the current programs.

The snapshot `reportFromWiring` runner remains public library surface for tests,
benchmarks, and programmatic one-shot use. The `watchReportFromWiring` runner
remains the generic watch runner used by `--watch`.

Watch-mode caveat: membership changes in a solution-style root tsconfig's
reference list need a restart. Each leaf project's own tsconfig hot-reloads.
Mid-run tsconfig breakage is tolerated silently — the watcher keeps the last
good program and recovers when the config is fixed.

## Architecture notes

- `adrs/0010-one-shot-default-watch-opt-in.md` records the current CLI mode
  decision: one-shot by default, `--watch` for continuous deltas.
- `adrs/0008-ndjson-event-output.md` records the NDJSON-by-default output
  decision and the event schema, which ADR-0010 retains for both modes.
- `adrs/0009-user-fleets-are-report-wiring.md` records the `ReportWiring`
  config model, retained by ADR-0010 except for ADR-0009's continuous-default
  consequence.
- `adrs/0007-continuous-watch-analysis.md` records the watch pipeline and its
  change gates; its continuous-only/default claim is superseded by ADR-0010.
- `adrs/0006-detection-is-streams-and-functions.md` records the stream/function
  ontology used by this implementation; its "daemon direction intentionally
  undecided" clause is superseded by ADR-0007 and ADR-0010, and its rejection of
  machine-readable output is superseded by ADR-0008.
- `adrs/0003-detectors-over-a-stratified-containment-tree.md` and
  `adrs/0005-detector-fleets-are-user-code.md` are superseded where they depend
  on identity metadata, category labels, generated guides, or structured reports.
