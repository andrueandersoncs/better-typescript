# no-unsafe-effect-apis

## Classification

Reported default policy; Effect API safety; file-local semantic detection.

## Active wiring

Listed in effectIdiomPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/noUnsafeEffectApis.ts
- packages/matchers/src/builtins/noUnsafeEffectApis.ts
- packages/matchers/src/support/tsSignature.ts

## Intent

Reject runtime use of Effect APIs whose canonical name contains unsafe.

## Detection boundary

Finds identifier, property-access, and string element-access references whose resolved canonical symbol comes from Effect and whose symbol name contains unsafe case-insensitively. It follows named-import aliases and first-party re-exports, including local aliases whose spelling omits unsafe.

## Exemptions and non-findings

Import/export declaration names, type-query references, safe Effect APIs, local or external-package unsafe-named values, strings/documentation, and non-literal element names are not findings.

## Guidance

Use the safe Effect counterpart and handle its Effect, Option, Result, or identity semantics; redesign the boundary if no safe equivalent exists.

## Dependencies

TypeScript checker, canonical symbol resolution, Effect package provenance, and a per-file unsafe import-name index.

## Tests and examples

- tests/noUnsafeEffectApis.test.ts
- tests/fixtures/no-unsafe-effect-apis/
- packages/guidance/examples/no-unsafe-effect-apis/

## Skill migration

- Proposed skill: lint-rule-no-unsafe-effect-apis
- Scope: local file
- Required semantic context: resolved canonical symbols and package provenance
- Runner phase/fleet: detection / effect-idioms
- Deterministic candidate generation: reuse noUnsafeEffectApisMatcher; text search alone is insufficient

## Open questions

None identified.
