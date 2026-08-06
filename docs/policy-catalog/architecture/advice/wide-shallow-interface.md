# wide-shallow-interface

## Classification

Derived file-level Architecture Explore advice.

## Active wiring

`architectureExploreDerive`; available in every Architecture Explore wiring.

## Implementation sources

- Derivation: `packages/guidance/src/architectureExplore/wideShallowInterface.ts`
- Evidence: `interface-burden`, `pass-through-wrappers`, and `composition-forwarders`

## Intent

Identify a broad public surface dominated by low-leverage forwarding rather than hidden policy.

## Detection boundary

Require an interface-burden fact and at least three deletable forwarders in the same file. Emit only
when the number of forwarders is more than half the measured operation count.

## Exemptions and non-findings

Stay silent below three forwarders, when forwarding is not dominant, or when wrappers have caller
leverage or non-call contracts.

## Guidance

Collapse forwarding surface and expose the smaller domain operation that hides ordering,
configuration, and adapter details.

## Dependencies

Consumes interface burden and the deletion-test subset of pass-through/composition evidence.

## Tests and examples

- `tests/architectureExploreDerive.test.ts`
- `packages/guidance/examples/wide-shallow-interface/`

## Skill migration

Proposed skill: `lint-rule-wide-shallow-interface`. Scope: file plus Program usage evidence. Run in
the architecture advice phase; reuse deterministic burden and forwarding facts.

## Open questions

None identified.
