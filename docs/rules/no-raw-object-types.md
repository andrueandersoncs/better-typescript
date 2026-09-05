# no-raw-object-types

## What it does

Reports the `object` keyword or an anonymous object type literal used directly, parenthesized, or within a union or intersection in function parameters and explicit return types; it does not descend through other type wrappers. The sole value parameter of a function named exactly `make`, `create`, `build`, or `construct` may be an anonymous construction record.

## When to use it

Use this rule when function boundaries must reuse named data structures instead of raw object shapes.

## Conformant

```ts
interface Input {
  value: string
}

function read(input: Input): string {
  return input.value
}
```

```ts
export const make = <Tag extends string, Payload>(
  definition: { readonly tag: Tag; readonly payload: Payload },
): readonly [Tag, Payload] => [definition.tag, definition.payload]
```

## Non-conformant

```ts
function read(input: { value: string }): string {
  return input.value
}
```
