# Project

## Architecture

The CLI analyzes the project graph rooted in the current directory. It loads `./tsconfig.json` and its recursive project references. Each config gets one `typescript-go` Program and contributes its non-declaration root source files. Optional project-relative globs restrict which files are linted.

The root Go module imports generated public compiler adapters from `github.com/andrueandersoncs/typescript-go`.

The complete sorted rule catalog is the default. Optional CLI rule names select a sorted catalog subset. Ordered `better-typescript.json` commands use an `add_inclusions` or `add_exclusions` type to replace or remove rules per matching file. For each file, every selected rule creates a listener map keyed by AST kind. The linter combines those listeners and dispatches them during one traversal. Rules report nodes or ranges through `rule.RuleContext`.

Analysis converts reports into the stable six-field NDJSON contract. It makes paths relative to the current directory, converts positions to one-based UTF-16 coordinates, sorts all records, and removes exact duplicates. The CLI prints only NDJSON to stdout and status or operational errors to stderr.

Each rule owns one `internal/rules/<rule_name>` package and a minimal `testdata` TypeScript project. Shared runtime code does not encode rule-specific verdicts.

## Links

- [npm distribution](./npm-distribution.md)
- [GitHub repository](https://github.com/andrueandersoncs/better-typescript)
- [License](https://github.com/andrueandersoncs/better-typescript/blob/main/LICENSE)
- [Security policy](https://github.com/andrueandersoncs/better-typescript/blob/main/SECURITY.md)
