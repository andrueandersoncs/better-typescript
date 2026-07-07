# Better TypeScript

Better TypeScript is a command-line analysis tool for TypeScript projects. It
uses the official `typescript` package to load a project, inspect source files
and type information, and print text signals with architectural advice for
coding agents.

## Goal

Better TypeScript's end users are **coding agents**. The useful output is not a
long checklist of local style nits; it is the smallest instruction that moves
the code toward the shape this project enforces.

The architecture is intentionally plain:

- A detector is any function that produces an Effect `Stream`.
- The stream is the signal.
- Rules see the program: loaded source text, AST nodes, and type information.
- Advice sees signals: it folds over rule streams and other advice streams.
- The CLI prints the text emitted by the leaf streams of the graph.

There are no suppressions, severities, per-rule options, machine-readable report
format, or result-based exit gate. If a signal appears, fix the cause in the
code.

## What the CLI does

1. Loads a TypeScript project from its `tsconfig.json`.
2. Creates a TypeScript `Program`.
3. Builds streams for source text and AST nodes from that program.
4. Runs built-in rule streams over the program.
5. Runs advice streams over those rule signals.
6. Prints the emitted text blocks in a stable order.

Advice blocks lead when they explain a broader shape, such as an imperative
state manager, a pipeline-hostile module, a hot subsystem, or systemic hotspots.
Rule blocks still render their locations.

## Usage

```sh
better-typescript
```

By default, the CLI analyzes the current working directory.

### Options

- `--project <directory>`: analyze a specific project directory instead of the
  current working directory.
- `--limit <integer>`: maximum number of signal blocks to display.
- `--offset <integer>`: number of signal blocks to skip before displaying.

Use `--limit` and `--offset` together to page through large reports:

```sh
better-typescript --limit 20
better-typescript --limit 20 --offset 20
```

When output is truncated, the CLI prints the visible range and the next
`--offset` value:

```text
Showing signals 1-20 of 57. Use --offset 20 to see the next page.
```

An empty report prints:

```text
No signals in /path/to/project.
```

### Exit codes

- `0`: the report was produced, even when it contains signals.
- `2`: the tool could not run, for example because the project path or
  TypeScript configuration is invalid.

## Non-goals

Better TypeScript intentionally does not provide:

- Dynamic plugin discovery or config strings resolved to packages at runtime.
- Suppression comments, severity levels, or per-rule configuration.
- A replacement for `tsc`, ESLint, or Prettier.
- Automatic code formatting.
- JSON output or a generated style-guide subcommand.

## Direction: continuous analysis

The current product is the reactive-ready batch form: snapshot streams are
collected once and printed. The same contracts define the later continuously
running product.

In that product, source watchers emit infinite streams. Changed files re-emit
their source text and AST nodes. Downstream rule and advice streams re-derive
only from the upstream streams they consume. Consumers can subscribe to leaf
streams over stdout, HTTP, or another protocol without changing the detector
model.

That daemon is not implemented here. It is a separate product decision, not a
reason to reintroduce identity metadata, category labels, a wire format, or a generated guide.

## Architecture notes

- `adrs/0006-detection-is-streams-and-functions.md` records the stream/function
  ontology used by this implementation.
- `adrs/0003-detectors-over-a-stratified-containment-tree.md` and
  `adrs/0005-detector-fleets-are-user-code.md` are superseded where they depend
  on identity metadata, category labels, generated guides, or structured reports.
