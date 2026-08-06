# duplicated-orchestration

## Classification

Derived directory-level FP Architecture Explore advice.

## Active wiring

`architectureExploreDerive`; produces findings when `composition-fingerprints` evidence is active.

## Implementation sources

- Derivation: `packages/guidance/src/architectureExplore/duplicatedOrchestration.ts`
- Evidence: `composition-fingerprints`

## Intent

Find the same multi-step call shape re-plumbed across multiple Physical Modules.

## Detection boundary

Group fingerprints by project identity and normalized call sequence. Emit when the same fingerprint
appears in at least two distinct file paths, anchored at their common directory. Report duplicate-site
and orchestration-step counts.

## Exemptions and non-findings

Ignore one-site fingerprints, different call sequences, duplicate exports within one file, and
matching fingerprints from different projects. Upstream evidence requires at least three steps.

## Guidance

Name the operation once and let callers compose it to prevent orchestration drift.

## Dependencies

Consumes composition-fingerprint evidence.

## Tests and examples

- `tests/duplicatedOrchestration.test.ts`
- `packages/guidance/examples/duplicated-orchestration/`

## Skill migration

Proposed skill: `lint-rule-duplicated-orchestration`. Scope: Program/directory. Run after deterministic
fingerprint extraction; require semantic validation before recommending a shared operation.

## Open questions

Whether agentic review should recognize semantically equivalent call shapes with different callee names.
