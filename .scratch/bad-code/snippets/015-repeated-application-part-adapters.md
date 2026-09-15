# Repeated application part adapters

- ID: 015
- Added: 2026-09-14
- Source: paste
- Path: none

## Why it is bad

> far too much repetition and patterns, lacking abstractions

## Code

```ts
const resourcePart = <const Spec extends ResourceSpec>(resource: Spec) => {
  const part = ApplicationParts.ResourcePart({ resource })
  return Struct.assign(part, { resource })
}

const commandPart = <const Bundle extends AnyCommandBundle>(bundle: Bundle) => {
  const part = ApplicationParts.CommandPart({ bundle })
  return Struct.assign(part, { bundle })
}

const nativePart = <const Bundle extends RpcBundle>(bundle: Bundle) => {
  const part = ApplicationParts.NativePart({ bundle })
  return Struct.assign(part, { bundle })
}

const applicationPart = <const Spec extends ApplicationSpec>(application: Spec) => {
  const part = ApplicationParts.ApplicationPart({ application })
  return Struct.assign(part, { application })
}
```

## Analysis

### Shape: Repeated sibling adapter wrappers

- Observable shape: Four sibling generic unary functions have the same two-statement body template: construct a part from a shorthand-property record, then assign that same record back onto the part.
- Existing rules: [`no-pass-through-object-wrappers`](../../../docs/rules/no-pass-through-object-wrappers.md) deliberately allows unary adapters and requires a direct returned constructor call; [`prefer-function-composition`](../../../docs/rules/prefer-function-composition.md) does not match the two-argument `Struct.assign` return; [`no-duplicate-function-names`](../../../docs/rules/no-duplicate-function-names.md) compares same-named functions across files, not differently named sibling bodies.
- Pattern: [repeated-sibling-adapter-wrappers](../patterns/repeated-sibling-adapter-wrappers.md)
- Emergence: new-prospective
- Reason: The repeated AST template is stable and detectable across sibling functions, while a shared typed adapter factory can own the construction-and-assignment protocol. One snippet does not independently confirm a default rule.
