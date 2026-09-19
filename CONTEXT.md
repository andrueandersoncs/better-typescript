# Better TypeScript

Better TypeScript is a Go linter that analyzes the TypeScript project graph rooted in the current directory.

## Domain

**Analysis run**: Load `./tsconfig.json` and its recursive project references, lint matching non-declaration root source files with each config's own `typescript-go` Program, normalize all reports, and return deterministic violations.

**Rule**: A name and listener map keyed by `typescript-go` AST kind. A listener receives the current source file, Program, checker, and node/range reporters through `rule.RuleContext`.

**Violation**: The final NDJSON record: rule name, `error` level, actionable message, relative slash path, and one-based UTF-16 line and column.

**Built-in catalog**: The fixed, sorted set of rules. All rules are enabled by default. CLI rule names can select a global subset.

**Rule override**: An ordered, tagged `better-typescript.json` entry that includes or excludes rules for matching project-relative files.

**Checker worker**: A linter worker paired with a `typescript-go` checker. It registers enabled listeners once per file and dispatches them during one AST traversal.

## Semantic review

**Policy**: A natural-language engineering requirement evaluated against repository evidence.

**Evidence**: Source, changes, configuration, or review context relevant to deciding a policy.

**Judgment**: A probabilistic answer about whether one policy is violated by specified evidence.

**Finding**: The deterministic classification produced from a judgment, or from missing required evidence.

**Review plan**: The inspectable policies, evidence, and required judgments selected before evaluation.

**Batch**: Independent judgments evaluated together because they share evidence.

## Modules

- `cmd/better-typescript`: process boundary and JSON configuration loading.
- `internal/analysis`: Program loading and violation normalization.
- `internal/linter` and `internal/rule`: traversal and rule interface.
- `internal/rules`: built-in catalog and implementations.
- `github.com/andrueandersoncs/typescript-go`: versioned public compiler adapters; see [`docs/compiler-foundation.md`](docs/compiler-foundation.md).
