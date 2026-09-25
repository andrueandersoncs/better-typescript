# Project

## Architecture

The CLI analyzes the project graph rooted in the current directory. It loads `./tsconfig.json` and its recursive project references. Each config gets one `typescript-go` Program and contributes its non-declaration root source files. Optional project-relative globs restrict which files are linted.

The `semantic` subcommand selects working-tree changes, current files (`--files` or `--all`), or a committed range. It evaluates embedded and project-local Markdown policies in three stages: Noul questions select candidate spans, Choice questions search those spans for a multi-location evidence set, and final Nouls judge applicability and violation from that set. The semantic module owns evidence selection, network retries, classifications, and reports.

The root Go module imports generated public compiler adapters from `github.com/andrueandersoncs/typescript-go`.

The complete sorted rule catalog is on by default. Optional CLI rule names select a sorted catalog subset. Ordered `better-typescript.json` commands use `add_exclusions` to turn rules off and `add_inclusions` to turn them back on for matching files; `"rules": "*"` addresses the complete catalog for that mode. Commands default to deterministic rules; semantic-mode commands apply the same per-file selection model to semantic policies. For each analyzed file, every selected deterministic rule creates a listener map keyed by AST kind. The linter combines those listeners and dispatches them during one traversal. Rules report nodes or ranges through `rule.RuleContext`.

Deterministic analysis converts reports into the stable six-field NDJSON contract. It makes paths relative to the current directory, converts positions to one-based UTF-16 coordinates, sorts all records, and removes exact duplicates. The default CLI prints only NDJSON to stdout and status or operational errors to stderr.

Semantic findings are per file and policy, may be probabilistic or inconclusive, and use a separate text or JSON report. TypeSafe receives source spans and policy text, never repository-wide context or raw diffs.

Each rule owns one `internal/rules/<rule_name>` package and a minimal `testdata` TypeScript project. Shared runtime code does not encode rule-specific verdicts.

## Executable rule examples

Selected TypeScript fences carry `lint=clean` or `lint=error:line:column[,line:column]`. Coordinates are one-based within the fence. `TestDocumentedExamples` compiles them against the pinned Effect source and checks the rule IDs and locations emitted by the real linter. Unmarked fences are illustrative.

Run `mise exec go@1.26 -- go test ./internal/rules -run TestDocumentedExamples`. The repository check also runs this test.

## Links

- [npm distribution](./npm-distribution.md)
- [GitHub repository](https://github.com/andrueandersoncs/better-typescript)
- [License](https://github.com/andrueandersoncs/better-typescript/blob/main/LICENSE)
- [Security policy](https://github.com/andrueandersoncs/better-typescript/blob/main/SECURITY.md)
