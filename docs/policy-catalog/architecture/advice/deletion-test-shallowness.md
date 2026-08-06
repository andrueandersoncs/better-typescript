# deletion-test-shallowness

## Classification

Derived file-level Architecture Explore advice.

## Active wiring

`architectureExploreDerive`; available in every Architecture Explore wiring.

## Implementation sources

- Derivation: `packages/guidance/src/architectureExplore/deletionTestShallowness.ts`
- Evidence: `pass-through-wrappers` and `composition-forwarders`

## Intent

Apply the deletion test only where removing an exact forwarder eliminates indirection without
spreading policy.

## Detection boundary

Select pass-through or composition-forwarder facts with at most one production caller and no
production non-call reference. Emit one file advice for every path containing at least one selected
forwarder, with aggregate forwarder and caller counts.

## Exemptions and non-findings

Preserve wrappers with two or more production callers or any non-call use. Do not infer shallowness
from interface size or forwarding shape alone.

## Guidance

Inline one-use operations or collapse re-exports; retain a Module when behaviour or naming would
reappear across multiple callers.

## Dependencies

Consumes `pass-through-wrappers` and `composition-forwarders`; its selected set also defines inputs
for wide shallow interface and bounce cluster.

## Tests and examples

- `tests/architectureExploreDerive.test.ts`
- `packages/guidance/examples/deletion-test-shallowness/`

## Skill migration

Proposed skill: `lint-rule-deletion-test-shallowness`. Scope: cross-file usage evidence summarized at
file level. Run in the architecture advice phase after forwarding candidates and never as a purely
prose-only scan.

## Open questions

None identified.
