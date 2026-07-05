# Better TypeScript

Better TypeScript is a simple command-line linter for TypeScript projects. It uses the official `typescript` package to analyze source files, understand their types, and provide actionable feedback about code quality and type-safety issues.

## Goal

Better TypeScript's end users are **coding agents**. The tool's purpose is
not the per-match list: it is **high-level refactoring advice, computed by
matching over violations of the rules themselves**. Rules produce findings;
higher-order matchers recognize when findings combine into an architectural
shape; the CLI then leads with the one instruction that dissolves the whole
cluster instead of forty local edits. The unified detector architecture
behind this is recorded in
`adrs/0003-detectors-over-a-stratified-containment-tree.md`.

Concretely, the tool:

- Loads a TypeScript project from its `tsconfig.json`
- Uses the TypeScript compiler API to inspect source files and type information
- Reports useful feedback directly in the terminal
- Checks project code against a fixed set of built-in rules
- Works as a straightforward CLI without a plugin architecture

## Rules and advice

Every check is a **detector** producing **findings** at some level of the containment hierarchy (see `adrs/0003-detectors-over-a-stratified-containment-tree.md`; the layered interpretation model is `adrs/0001-layered-match-interpretation.md`):

- **Rule matches** are the base measurements: node-level findings. Each built-in rule scans the project for a particular pattern or type-safety concern. Rules carry a role: **finding** rules gate the exit code and appear in the style guide; **signal** rules are measurements consumed only by higher-order detectors and are never reported directly.
- **Advice** findings are higher-order matches: detectors whose sentences quantify over other detectors' findings, folded over project ▸ directory ▸ file. When findings combine into a recognized shape — an imperative state manager, a pipeline-hostile module, a hot subsystem, systemic hotspots across the codebase — the CLI leads with the advice, its evidence, and an architectural remediation, and collapses the consumed matches beneath it. Advice can consume advice: strata are computed from what each sentence mentions, so a detector like `systemic-hotspots` evaluates one layer above the subsystem and density advice it reads.

When a rule finds a match, the CLI reports:

- The rule name
- The file and location of the match
- A short description of the issue
- A remediation hint explaining how to improve the code
- A passing example of the preferred pattern

Rules and syndromes are part of the core CLI and are not intended to be loaded through plugins or third-party extensions. There are no suppressions: findings must be fixed, signals are measurements, advice is interpretation.

## Non-goals

This project is intentionally small in scope. It does not aim to provide:

- A plugin system
- A framework for custom third-party rules
- A replacement for `tsc`, ESLint, or Prettier
- Automatic code formatting

## How it works

The CLI will use the `typescript` package to:

1. Read the target project's TypeScript configuration.
2. Create a TypeScript `Program`.
3. Use the type checker to analyze source files.
4. Run the built-in rules against the project.
5. Collect matches, diagnostics, and remediation hints.
6. Print results in a concise CLI-friendly format.

## Intended usage

```sh
better-typescript
```

By default, the CLI analyzes the current working directory and prints every match.

### Options

- `--project <directory>`: Analyze a specific project directory instead of the current working directory.
- `--limit <integer>`: Maximum number of rule matches to display.
- `--offset <integer>`: Number of rule matches to skip before displaying.
- `--format <text|json>`: Output format. `text` (default) leads with diagnoses, then groups matches by rule with a remediation hint and a passing example; `json` emits the same report — diagnoses included — as machine-readable JSON for tooling and agents.
- `--detail`: List every match location, including matches collapsed under a diagnosis.
- `--signals`: Include signal-rule matches in the JSON report's `signals` section. Signals are measurements consumed by the match interpreter — never violations — so they stay out of every report by default, never affect the exit code, and never render in text output.

### Subcommands

- `better-typescript rules`: Print the style guide compiled from every built-in rule — its id, description, and bad/good example snippets. Use `--format json` for a machine-readable rule catalog. The guide is generated from the same rule definitions the linter enforces, so instruction and enforcement cannot drift.

Use `--limit` and `--offset` together to page through large result sets:

```sh
better-typescript --limit 20             # matches 1-20
better-typescript --limit 20 --offset 20 # matches 21-40
```

When the output is truncated, the CLI prints the visible range and the `--offset` value for the next page.

### Exit codes

- `0`: no finding-rule matches.
- `1`: finding-rule matches exist anywhere in the result set, even if the current page is empty.
- `2`: the tool could not run (missing or invalid `tsconfig.json`, configuration errors).

## Project status

The core linter, the style guide subcommand, the matcher language, and the layered match interpreter are implemented and self-hosting: the codebase passes every one of its own finding rules. Twelve rules are defined as matcher-language sentences compiled by the same listener machinery hand-written rules use; the rest are host primitives behind the identical `Rule` interface (see `adrs/0002-rule-bodies-in-the-matcher-language.md` for the boundary).
