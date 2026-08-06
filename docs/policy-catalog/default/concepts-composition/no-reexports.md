# no-reexports

## Classification

Reported default policy; module ownership; file-local symbol/syntax detection.

## Active wiring

Listed in conceptAndCompositionPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/noReexports.ts
- packages/matchers/src/builtins/noReexports.ts

## Intent

Prevent modules from forwarding dependency bindings instead of owning a local interface.

## Detection boundary

Reports every export declaration with a module specifier: each named specifier, a namespace clause, or the whole export-star declaration. For export declarations without a module specifier, it reports named specifiers whose local/default/named/namespace binding was imported in the same file. It also reports export assignments whose expression is an imported identifier.

## Exemptions and non-findings

Exports of locally declared values, ordinary imports, and export assignments of non-import identifiers/expressions are not findings. Type-only direct re-exports are not specially exempted.

## Guidance

Import at the use site and expose a locally defined public interface instead.

## Dependencies

Source-file import/export AST and local imported-name resolution; no TypeScript checker.

## Tests and examples

- tests/noReexports.test.ts
- tests/fixtures/architecture-evidence/src/reexports.ts
- tests/fixtures/architecture-evidence/src/defaultReexport.ts
- packages/guidance/examples/no-reexports/

Tests cover export-star, namespace, named/renamed, imported-local, direct-from-module, type, and default re-export forms.

## Skill migration

- Proposed skill: lint-rule-no-reexports
- Scope: local file
- Required semantic context: complete import table and export syntax
- Runner phase/fleet: module-surface detection / concepts-composition
- Deterministic candidate generation: reuse noReexportsMatcher

## Open questions

None identified.
