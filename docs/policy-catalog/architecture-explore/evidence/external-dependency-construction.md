# external-dependency-construction

## Classification

Silent node-level OOP architecture evidence policy.

## Active wiring

`architectureExploreOopPolicies`; enabled by the combined and OOP Architecture Explore wirings.

## Implementation sources

- Guidance: `packages/guidance/src/policies/externalDependencyConstruction.ts`
- Matcher: `packages/matchers/src/builtins/externalDependencyConstruction.ts`
- Composition-root classification: `packages/matchers/src/support/compositionRoot.ts`

## Intent

Measure construction of imported external collaborators inside behaviour.

## Detection boundary

Match `new` expressions whose root symbol comes from an import and whose constructor name is Stripe,
Twilio, or ends in Client, Gateway, Repository, Service, Transport, Connection, Pool, Driver,
Producer, Consumer, or Database.

## Exemptions and non-findings

Ignore composition-root files and constructions returned directly from a return statement or
concise arrow factory. Ignore local constructors and imported names outside the collaborator vocabulary.

## Guidance

Classify concentrated construction before introducing a real production/test seam.

## Dependencies

Consumed by hard-to-test hotspot.

## Tests and examples

- `tests/architectureEvidence.test.ts`
- `packages/guidance/examples/hard-to-test-hotspot/`

## Skill migration

Use symbol resolution and name filtering as deterministic candidates for the hard-to-test skill.
Required scope is local with composition-root context; run in the OOP architecture evidence phase.

## Open questions

Whether the fixed collaborator-name vocabulary should remain after agentic semantic classification.
