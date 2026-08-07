# thin-http-handlers

## Classification
Derived file-level Effect-quality advice.

## Active wiring
`effect-quality-advice-evidence` plus `effectQualityDerive`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/evidenceHttpHandlers.ts`; `packages/guidance/src/effectQuality/advice.ts`.

## Intent
Limit handlers to transport translation and service delegation.

## Detection boundary
In adapter/application functions whose inferred name ends in handler/route/controller/endpoint/resolve/loader/action, emits for persistence-like calls; application handlers also emit for raw/Effect/generic network-method calls.

## Exemptions and non-findings
Other roles/names, adapter network calls, and calls outside the method-name lists are quiet.

## Guidance
Decode input, call a service, and map typed failures to transport responses.

## Dependencies
Architecture role, enclosing-function name, imported HTTP identity, method-name heuristics.

## Tests and examples
Positive `userHandler` persistence call: `tests/fixtures/effect-quality/src/application/rules.ts`; coverage: `tests/effectQuality.test.ts`. No thin-handler negative fixture identified.

## Skill migration
Propose `lint-rule-effect-quality-thin-http-handlers`; local scope; role, function-name, and call semantics; Effect HTTP fleet, advice phase; deterministic candidate generation plus agent judgment: partial.

## Open questions
Generic method names such as `execute` can classify unrelated APIs.
