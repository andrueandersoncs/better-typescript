# http-response-validation

## Classification
Reported Effect-quality rule.

## Active wiring
`effect-quality-rules` via `effectQualityWiring`; self-hosted for `packages/*/src/**`.

## Implementation sources
`packages/matchers/src/builtins/effectQuality/reportedHttpResponseValidation.ts`; `packages/matchers/src/builtins/effectQuality/reportedHttpResponseShared.ts`; `packages/guidance/src/policies/effectQualityRules.ts`.

## Intent
Decode unknown HTTP response bodies with Schema at the adapter boundary.

## Detection boundary
In adapter files, reports `response.json()`-identity calls lacking a direct parent/argument Schema decoder, Effect HTTP response schema API, or any recognized validation call in the enclosing function body.

## Exemptions and non-findings
Non-adapters, validated function scopes, response-schema APIs, and calls whose symbol is not recognized as `Response.json` are quiet.

## Guidance
Use `Schema.decodeUnknownEffect` or an HttpClient response schema decoder.

## Dependencies
Architecture role, TypeScript checker and DOM response identity, imported Schema/HTTP API classification, function-scope scan.

## Tests and examples
Positive adapter body read: `tests/fixtures/effect-quality/src/adapters/http.ts`; kind coverage: `tests/effectQuality.test.ts`. No validated negative fixture identified.

## Skill migration
Propose `lint-rule-effect-quality-http-response-validation`; local scope; checker, role, and function context; Effect HTTP fleet, semantic phase; deterministic candidates: strong.

## Open questions
Any validation anywhere in the enclosing function suppresses the finding, without proving it consumes this body value.
