# no-unsafe-dictionary-type

## What it does

Reports object dictionaries whose value type is `unknown`, `any`, `object`, `{}`, or a union or alias containing one of them. Generic constraints remain valid.

## When to use it

Use it to require a concrete value contract for stored dictionary entries.

## Conformant

```ts
type Commands = Record<string, Command>
```

## Non-conformant

```ts
type Metadata = Record<string, unknown>
```
