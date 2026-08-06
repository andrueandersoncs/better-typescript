# no-async-functions

## Classification

Reported default policy; Effect control flow; file-local syntactic detection.

## Active wiring

Listed in controlFlowPolicies, then defaultWiring; self-hosted on packages/*/src/**.

## Implementation sources

- packages/guidance/src/policies/noAsyncFunctions.ts
- packages/matchers/src/builtins/noAsyncFunctions.ts

## Intent

Model asynchronous work with Effect instead of async/await functions.

## Detection boundary

Reports an async keyword only when its parent is a function declaration, function expression, arrow function, or method declaration.

## Exemptions and non-findings

Non-async functions, Promise-returning functions without async, and non-function uses of the syntax kind are not findings.

## Guidance

Use Effect and Effect.tryPromise for incoming promises; satisfy outgoing Promise contracts with a non-async function returning Effect.runPromise.

## Dependencies

TypeScript modifier-parent AST only.

## Tests and examples

- tests/noAsyncFunctions.test.ts
- tests/fixtures/no-async-functions/
- packages/guidance/examples/no-async-functions/

## Skill migration

- Proposed skill: lint-rule-no-async-functions
- Scope: local file
- Required semantic context: async modifier and parent function kind
- Runner phase/fleet: syntax detection / control-flow
- Deterministic candidate generation: reuse noAsyncFunctionsMatcher

## Open questions

None identified.
