---
globs:
  - "**/*.{ts,tsx}"
---
# Use Readonly for fully readonly object types

Apply this policy only to TypeScript object type aliases. A file with no object type alias cannot violate it.

When every property of an object type is readonly, write it as `Readonly<{ ... }>` instead of repeating the `readonly` modifier on each property:

```ts
type Item = Readonly<{
  id: string
  count: number
}>
```

Report any of these shapes:

- a type alias whose properties all carry `readonly`, such as `type Item = { readonly id: string; readonly count: number }`;
- a mix of `Readonly<{ ... }>` and per-property `readonly` on the same type, such as `Readonly<{ readonly id: string }>`.

Do not report a type where only some properties are readonly, an interface, or a type whose shape is fixed by an external contract or generated code.
