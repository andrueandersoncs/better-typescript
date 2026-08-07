# http-status-decode-order

## Classification
Reported Effect-quality rule.

## Active wiring
`effect-quality-rules` via `effectQualityWiring`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/reportedHttpStatusOrder.ts`; `packages/matchers/src/builtins/effectQuality/reportedHttpStatusClassify.ts`; `packages/matchers/src/builtins/effectQuality/reportedHttpStatusAccess.ts`; `packages/guidance/src/policies/effectQualityRules.ts`.

## Intent
Classify HTTP status before decoding a success body.

## Detection boundary
In adapter functions, reports recognized raw body reads or schema/HttpClient body decoders when AST order shows the body read before a status access/classifier and the function otherwise looks HTTP-related.

## Exemptions and non-findings
Non-adapters, status-first code, `schemaBodyJson`-style APIs that own classification, non-HTTP Schema decodes, and unrecognized control/data flow are quiet.

## Guidance
Apply `filterStatusOk` or equivalent response classification before decoding.

## Dependencies
Architecture role, imported HTTP/Schema identity, Response status/body access classification, source-order/function-body walk.

## Tests and examples
Positive async adapter: `tests/fixtures/effect-quality/src/adapters/http.ts`; kind coverage: `tests/effectQuality.test.ts`. No status-first or Effect HttpClient fixtures identified.

## Skill migration
Propose `lint-rule-effect-quality-http-status-decode-order`; local scope; checker, control-order, and role context; Effect HTTP fleet, semantic phase; deterministic candidates: strong.

## Open questions
The ordering analysis is syntactic and does not model branch-specific dominance.
