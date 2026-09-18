# Architecture

The CLI analyzes the project graph rooted in the current directory. It loads `./tsconfig.json` and its recursive project references. Each config gets one `typescript-go` Program and contributes its non-declaration root source files. Optional project-relative globs restrict which files are linted.

The `semantic` subcommand evaluates the current Git change against embedded and project-local Markdown policies. `internal/semanticlint` owns Git evidence, deterministic checks, bounded TypeSafe routing, HTTP retries, classification, and reports. TypeSafe receives selected evidence only; requests are limited to 32,000 bytes and concurrent network calls are bounded.

The root Go module imports generated public compiler adapters from `github.com/andrueandersoncs/typescript-go`. See [`docs/compiler-foundation.md`](docs/compiler-foundation.md) for its pin, provenance, and update workflow.

The complete sorted rule catalog is the default. Optional CLI rule names select a sorted catalog subset. Ordered `better-typescript.json` commands use an `add_inclusions` or `add_exclusions` type to replace or remove rules per matching file. For each file, every selected rule creates a listener map keyed by AST kind. The linter combines those listeners and dispatches them during one traversal. Rules report nodes or ranges through `rule.RuleContext`.

Analysis converts reports into the stable six-field NDJSON contract. It makes paths relative to the current directory, converts positions to one-based UTF-16 coordinates, sorts all records, and removes exact duplicates. The CLI prints only NDJSON to stdout and status or operational errors to stderr.

Semantic lint uses a separate report contract because findings can be repository-wide and probabilistic. Live semantic runs return `0` when clean, `1` for actionable findings, and `2` for operational failures.

Each rule owns one `internal/rules/<rule_name>` package and a minimal `testdata` TypeScript project. Shared runtime code does not encode rule-specific verdicts.

Semantic policies are data, not `typescript-go` listener rules. Defaults live under `internal/semanticlint/defaults/`; projects can add Markdown policies under `.better-typescript/rules/`.
