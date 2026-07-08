# Better TypeScript

Better TypeScript is a continuously running analysis tool for TypeScript
projects. It uses the official `typescript` package to watch a project, inspect
source files and type information, and push signals with architectural advice
for coding agents to stdout as the code changes — one NDJSON event per line by
default, human-readable text blocks with `--pretty`.

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
2. Starts a TypeScript watch program per leaf project.
3. Prints the initial report, then keeps running.
4. On every change batch, re-runs the rule and advice streams over the rebuilt
   programs and pushes only what changed:
   - a block re-emits whenever its content changes;
   - a block that disappears emits one cleared event;
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
  rendered block.
- `cleared` — a previously emitted block disappeared; `text` is its one cleared
  line.
- `empty` — the initial report found no signals.

`key` is the block's stable identity across events. Rule keys carry
`{ _tag: "rule", name, message, hint }`; advice keys carry
`{ _tag: "advice", level, path, title }`.

With `--pretty`, the CLI renders the same events as the human-readable text
blocks instead (each block followed by a blank line; the empty report prints
`No signals in /path/to/project.`).

Status lines (for example `Watching /path/to/project for changes.`) go to
stderr; stdout carries only the event stream. Capture or filter it by piping:

```sh
better-typescript | tee report.ndjson
better-typescript | jq -r 'select(._tag == "signal") | .text'
```

## Usage

```sh
better-typescript
```

By default, the CLI watches the current working directory. Stop it with Ctrl-C.

### Options

- `--project <directory>`: watch a specific project directory instead of the
  current working directory.
- `--pretty`: render human-readable text blocks instead of NDJSON events.

### Exit codes

- `0`: the report stream ran, including when it was ended with Ctrl-C.
- `2`: the tool could not start, for example because the project path or
  TypeScript configuration is invalid.

## Non-goals

Better TypeScript intentionally does not provide:

- Dynamic plugin discovery or config strings resolved to packages at runtime.
- Suppression comments, severity levels, or per-rule configuration.
- A replacement for `tsc`, ESLint, or Prettier.
- Automatic code formatting.
- A generated style-guide subcommand.

## Continuous analysis

The tool is the continuously running product. Sources are
`ts.createWatchProgram`-backed streams: one fresh program context per rebuild,
diffed by `ts.SourceFile` identity into changed and removed files. The product
is a linear pipeline of stream transformers — source updates → signal batches →
advice and report blocks → per-block delta events — where every element carries
one consistent batch and change gates between the stages keep quiet batches
silent. Rules recompute in full inside each batch, so detection sets always
match what a fresh snapshot report would compute for the current programs.

The snapshot report path (`loadProject` + `report`) remains as library surface
for tests and the benchmark; the CLI does not use it.

One restart caveat: membership changes in a solution-style ROOT tsconfig's
reference list need a restart. Each leaf project's own tsconfig hot-reloads.
Mid-run tsconfig breakage is tolerated silently — the watcher keeps the last
good program and recovers when the config is fixed.

## Architecture notes

- `adrs/0008-ndjson-event-output.md` records the NDJSON-by-default output
  decision and the event schema.
- `adrs/0007-continuous-watch-analysis.md` records the continuous-only product
  decision, the pipeline of stream transformers, and its change gates.
- `adrs/0006-detection-is-streams-and-functions.md` records the stream/function
  ontology used by this implementation; its "daemon direction intentionally
  undecided" clause is superseded by ADR-0007, and its rejection of
  machine-readable output is superseded by ADR-0008.
- `adrs/0003-detectors-over-a-stratified-containment-tree.md` and
  `adrs/0005-detector-fleets-are-user-code.md` are superseded where they depend
  on identity metadata, category labels, generated guides, or structured reports.
