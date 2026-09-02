# Unknown Effect service error

- Status: prospective
- Status-source: agent
- Rule candidate: none
- Created: 2026-09-02
- Updated: 2026-09-02

## Invariant

Do not expose `unknown` in an Effect service operation's error channel. Use specific tagged errors, or `never` when the operation cannot fail. `unknown` remains allowed at untyped ingress before errors are refined.

## Detection

In a `Context.Service` shape, find operation signatures whose returned `Effect.Effect` has `unknown` as its error type argument. Resolve imported and aliased Effect types with the checker.

## Evidence

- Snippets:
  - [004](../snippets/004-dispatch-queue-service.md)
- Allowed nearby:
  - An infallible service operation returning `Effect.Effect<Value>` or `Effect.Effect<Value, never>`
  - An untyped adapter that catches `unknown` and refines it before the service boundary

## Overlap

`no-error-type` rejects the built-in `Error` type but permits `unknown` at untyped boundaries. `typed-error-recovery` checks broad recovery calls, not declared service error channels. No built-in rule owns this shape.

## Decision

- 2026-09-02: Prospective from one snippet; detection and replacement are clear, but independent evidence is still required.
