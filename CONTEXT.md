# Better TypeScript

Better TypeScript is a Go linter that analyzes one TypeScript project from the current directory.

## Domain

**Analysis run**: Load `./tsconfig.json` into one `typescript-go` Program, lint its non-declaration root source files, normalize all reports, and return deterministic violations.

**Rule**: A name and listener map keyed by `typescript-go` AST kind. A listener receives the current source file, Program, checker, and node/range reporters through `rule.RuleContext`.

**Violation**: The final NDJSON record: rule name, `error` level, actionable message, relative slash path, and one-based UTF-16 line and column.

**Built-in catalog**: The fixed, sorted set of 129 rules. Every rule is enabled once for every linted file.

**Checker worker**: A linter worker paired with a `typescript-go` checker. It registers enabled listeners once per file and dispatches them during one AST traversal.

## Modules

- `cmd/better-typescript`: process boundary.
- `internal/analysis`: Program loading and violation normalization.
- `internal/linter` and `internal/rule`: traversal and rule interface.
- `internal/rules`: built-in catalog and implementations.
- `shim`, `patches`, `typescript-go`: pinned compiler foundation.
