# require-export-jsdoc

## What it does

Requires JSDoc directly above every export to use this structure:

```ts
/**

Use when: <explanation>

Example: <example>

**/
```

`Use when:` and `Example:` must be non-empty, ordered, and separated by blank lines. Both sections may span multiple lines. Conventional leading `*` characters are allowed. The rule covers declarations, export lists, re-exports, default exports, and `export =`.

It reports: `Exports need multi-line JSDoc with non-empty "Use when:" and "Example:" sections.`

## When to use it

Use it when every public export must explain when and how to use it.

## Conformant

```ts
/**

Use when: callers need the shared value because this module owns its identity
across package boundaries.

Example: import { shared } from "./shared.js"
then pass shared to the consumer.

**/
export const shared = 2
```

## Non-conformant

```ts
/** Use this export when callers need the shared value. */
export const oneLine = 2

/**

Use when: callers need the shared value.

**/
export const missingExample = 3
```
