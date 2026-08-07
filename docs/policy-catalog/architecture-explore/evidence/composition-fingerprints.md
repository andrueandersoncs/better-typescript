# composition-fingerprints

## Classification

Silent Program-level FP architecture evidence policy.

## Active wiring

`architectureExploreFpPolicies`; enabled by the combined and FP Architecture Explore wirings.

## Implementation sources

- Guidance: `packages/guidance/src/policies/compositionFingerprints.ts`
- Matcher: `packages/matchers/src/builtins/compositionFingerprints.ts`
- Evidence: `CompositionFingerprintData`

## Intent

Normalize exported orchestration into comparable call-shape fingerprints.

## Detection boundary

In production files, walk exported function bodies and recursively unwrap curried arrow definitions.
Collect call and point-free `pipe`/`flow` stage names in preorder, excluding a pipe's data subject.
Emit only fingerprints with at least three steps, recording project identity and export name.

## Exemptions and non-findings

Skip tests, exports with fewer than three recognized steps, optional property chains, and expression
forms outside the explicit walker. Identical fingerprints remain separate across projects.

## Guidance

Compare fingerprints across Physical Modules to find duplicated orchestration.

## Dependencies

Consumed by duplicated orchestration.

## Tests and examples

- `tests/duplicatedOrchestration.test.ts`
- `packages/guidance/examples/duplicated-orchestration/`

## Skill migration

Retain deterministic fingerprint extraction as candidate support. Run once per Program before the
directory-level duplicated-orchestration skill.

## Open questions

Whether semantic agent review should broaden beyond the matcher's explicit expression walker.
