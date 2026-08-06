# pass-through-wrappers

## Classification

Silent architecture evidence policy in the core Architecture Explore fleet.

## Active wiring

`architectureExploreCorePolicies`; enabled by every Architecture Explore wiring.

## Implementation sources

- Guidance: `packages/guidance/src/policies/passThroughWrappers.ts`
- Matcher: `packages/matchers/src/builtins/passThroughWrappers.ts`
- Evidence: `PassThroughWrapperData` in `packages/matchers/src/builtins/architectureExploreData.ts`

## Intent

Measure Modules and exported operations that add forwarding surface without adding behaviour, while
retaining caller leverage for later deletion tests.

## Detection boundary

Emit `reexport` evidence when every non-import top-level statement is an export declaration with a
module specifier. Emit `forwarding-call` evidence for an exported function whose concise body, or
first block statement, is one call or construction that consumes every plain identifier parameter
exactly once and in order. Object arguments may forward shorthand or identifier-valued properties;
the receiver may consume one parameter. Record production callers and non-call references.

## Exemptions and non-findings

Ignore files with any other public statement. Reject destructured, defaulted, rest, reordered,
duplicated, transformed, or omitted parameters and bodies with work before the return.

## Guidance

Treat the fact as evidence only. Delete low-leverage indirection, but preserve a public seam or
operation when multiple callers benefit from its name or behaviour.

## Dependencies

Consumed by deletion-test shallowness, wide shallow interface, and bounce cluster.

## Tests and examples

- `tests/architectureEvidence.test.ts`
- `tests/architectureEvidenceReuse.test.ts`
- No dedicated user-facing example; downstream advice owns refactor examples.

## Skill migration

Do not expose as a standalone lint skill. Preserve its TypeScript-aware recognizer as a deterministic
candidate generator shared by cross-file architecture skills in the architecture evidence phase.

## Open questions

None identified.
