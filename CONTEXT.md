# Better TypeScript

Better TypeScript is a Go linter that analyzes the TypeScript project graph rooted in the current directory.

## Domain

**Analysis run**: Load `./tsconfig.json` and its recursive project references, lint matching non-declaration root source files with each config's own `typescript-go` Program, normalize all reports, and return deterministic violations.

**Rule**: A name and listener map keyed by `typescript-go` AST kind. A listener receives the current source file, Program, checker, and node/range reporters through `rule.RuleContext`.

**Violation**: The final NDJSON record: rule name, `error` level, actionable message, relative slash path, and one-based UTF-16 line and column.

**Built-in catalog**: The fixed, sorted set of 131 rules. All rules are enabled by default. CLI rule names can select a global subset.

**Rule override**: An ordered, tagged `better-typescript.json` entry that includes or excludes rules for matching project-relative files.

**Checker worker**: A linter worker paired with a `typescript-go` checker. It registers enabled listeners once per file and dispatches them during one AST traversal.

## Modules

- `cmd/better-typescript`: process boundary and JSON configuration loading.
- `internal/analysis`: Program loading and violation normalization.
- `internal/linter` and `internal/rule`: traversal and rule interface.
- `internal/rules`: built-in catalog and implementations.
- `github.com/andrueandersoncs/typescript-go`: versioned public compiler adapters; see [`docs/compiler-foundation.md`](docs/compiler-foundation.md).
