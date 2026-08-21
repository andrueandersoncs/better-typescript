# Oxlint custom-rule portability

Research snapshot: Oxlint 1.79.0 and Better TypeScript's current 129-rule catalog.

## Result

**35 of 129 rules (27.1%) can be ported faithfully to Oxlint JavaScript custom rules today.**

The other **94 rules (72.9%)** depend on TypeScript checker, symbol, module, or project data that
Oxlint does not expose to JavaScript plugins.

### Type-aware Oxlint is a separate rule backend

Oxlint itself supports type-aware linting through the separate `oxlint-tsgolint` binary. That binary
builds TypeScript programs with `typescript-go` and runs its compiled-in `typescript/*` rules. It
does not pass type data to `jsPlugins`, and it has no documented custom-rule loading API. Its rule
registry is compiled into the Go binary.

Oxlint's JavaScript plugin documentation therefore still lists “lint rules that rely on TypeScript
type-awareness” as unsupported. A fork of `tsgolint` could add our rules in Go, but that is a
different scope from custom Oxlint JavaScript rules.

This count assumes a port must preserve current findings. It does not count:

- name-based approximations of resolved APIs;
- replacing a rule with a similar native Oxlint rule;
- running a separate TypeScript Program inside the plugin.

## Portable rules

- `handrolled-ttl-cache`
- `no-async-functions`
- `no-blank-lines-between-single-line-declarations`
- `no-duplicate-if-bodies`
- `no-explicit-any-return`
- `no-for-in-loops`
- `no-for-loops`
- `no-for-of-loops`
- `no-inline-boolean-expressions`
- `no-manual-type-dispatch`
- `no-multiple-boolean-operators`
- `no-mutable-variable-declarations`
- `no-nested-if-statements`
- `no-new-error`
- `no-non-null-assertion`
- `no-pass-through-object-wrappers`
- `no-raw-object-types`
- `no-reexports`
- `no-switch-statements`
- `no-throw`
- `no-try-catch`
- `no-undefined`
- `no-value-aliases`
- `prefer-conditional-return`
- `prefer-direct-boolean-return`
- `prefer-effect-array-append-all`
- `prefer-effect-record-filter-map`
- `prefer-effect-schema-guard`
- `prefer-equivalence-strict-equal`
- `prefer-implicit-return`
- `prefer-option-match`
- `require-because-in-comments`
- `require-blank-lines-around-multiline-declarations`
- `typescript-namespaces`
- `unsafe-casts`

These rules need only per-file TypeScript AST, source text, comments, or local syntax-derived exit
analysis.

## Why the other 94 are blocked

The dependency counts overlap:

| Missing input                                   | Rules |
| ----------------------------------------------- | ----: |
| TypeScript checker, types, or symbols           |    94 |
| Resolved imports, modules, or re-export barrels |    62 |
| Cross-file or project aggregation               |    14 |

Oxlint's JavaScript plugin API supports TypeScript syntax, ESLint-style visitors, source text,
comments, tokens, scope analysis, control-flow analysis, diagnostics, fixes, and suggestions. It
explicitly does not support type-aware custom rules. `parserServices` is empty. The rule context
also has no module graph, resolver, TypeScript Program, or supported project-end lifecycle.

Scope analysis is not enough to preserve our current symbol checks. Our rules use TypeScript
identity to handle shadowing, aliases, dependency declarations, and first-party re-export barrels.

## Validation

- Counted the 129 exports in
  [`packages/rules/src/builtinRules.ts`](../../packages/rules/src/builtinRules.ts).
- Inspected every production rule and its relevant shared helpers.
- Ran an Oxlint 1.79.0 probe against a `.ts` file. A custom rule visited `TSNonNullExpression` and
  read both `context.sourceCode.getText(node)` and comments successfully.

## Oxlint sources

- [JavaScript plugins and API support](https://oxc.rs/docs/guide/usage/linter/js-plugins.md)
- [Writing plugins and per-file lifecycle](https://oxc.rs/docs/guide/usage/linter/writing-js-plugins.md)
- [Type-aware linting architecture](https://oxc.rs/docs/guide/usage/linter/type-aware.md)
- [`tsgolint`'s compiled rule registry](https://github.com/typescript-eslint/tsgolint/blob/main/cmd/tsgolint/main.go#L162-L226)
- [Empty `parserServices`](https://github.com/oxc-project/oxc/blob/b016fd41101de5038a77484c11c0a19c1aa965a9/apps/oxlint/src-js/plugins/source_code.ts#L226-L235)
- [Rule context surface](https://github.com/oxc-project/oxc/blob/b016fd41101de5038a77484c11c0a19c1aa965a9/apps/oxlint/src-js/plugins/context.ts#L319-L489)

## Recommendation

Prototype three representative ports first:

1. `no-for-loops` for basic AST traversal.
2. `require-because-in-comments` for source and comment APIs.
3. `no-duplicate-if-bodies` for syntax-derived exit analysis.

Pin Oxlint. JavaScript plugins are alpha and are not covered by stable semver guarantees.
