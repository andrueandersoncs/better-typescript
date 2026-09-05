# Dense generic function signature

- ID: 009
- Added: 2026-09-05
- Source: paste
- Path: none

## Why it is bad

the information is too dense, too much is packed in

## Code

```ts
export const define = <
  S,
  const Action extends Schema.Top,
  const Operations extends ReadonlyArray<AnyOperationDefinition>,
  const Handlers extends AlgebraShape<OperationType<Operations[number]>>,
>(options: {
  readonly reducer: ReducerDefinition<S, Action, Operations>
  readonly algebra: Handlers
}): Definition<S, Action, Operations, Handlers> => {
```

## Analysis

### Shape: Inline parameter object type

- Observable shape: The exported function declares its two-member options object directly in the parameter.
- Existing rules: `no-raw-object-types`
- Pattern: none
- Emergence: covered
- Reason: The built-in rule reports anonymous object types at function parameter boundaries and recommends reusing a named data structure or collapsing the seam.

### Shape: Interdependent generic signature

- Observable shape: One function signature declares four type parameters, derives `Handlers` from `Operations`, and repeats the parameters across its input and result types.
- Existing rules: `no-raw-object-types` covers only the nested parameter object; `prefer-inferred-types` does not remove generic constraints.
- Pattern: none
- Emergence: no-pattern
- Reason: A type-parameter or dependency-count threshold would be arbitrary, and one example does not establish a generally better replacement for necessary type relationships.
