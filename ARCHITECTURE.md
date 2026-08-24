# Architecture

The CLI analyzes only the current directory. It loads `./tsconfig.json` into one `typescript-go` Program and selects non-declaration root source files.

The complete sorted rule catalog is passed to the tsgolint-derived checker-worker linter. For each file, every rule creates a listener map keyed by AST kind. The linter combines those listeners and dispatches them during one traversal. Rules report nodes or ranges through `rule.RuleContext`.

Analysis converts reports into the stable six-field NDJSON contract. It makes paths relative to the current directory, converts positions to one-based UTF-16 coordinates, sorts all records, and removes exact duplicates. The CLI prints only NDJSON to stdout and status or operational errors to stderr.

Each rule owns one `internal/rules/<rule_name>` package and a minimal `testdata` TypeScript project. Shared runtime code does not encode rule-specific verdicts.
