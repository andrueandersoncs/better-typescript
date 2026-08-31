# require-export-jsdoc

## What it does

Requires JSDoc directly above every export.

Private exports use this structure:

````ts
/**

Scope: private

**/
export const internalValue = 1
````

Public exports use this structure:

````ts
/**

Scope: public

When to use: Consumers need one stable identifier across package boundaries.

Example:
```ts
import { packageIdentifier } from "./package-identifier.js"

console.log(packageIdentifier)
```

**/
export const packageIdentifier = "core"
````

`Scope:` must be the bare word `public` or `private`, without quotes. Private JSDoc must not include `When to use:` or `Example:`. Public JSDoc must include both sections in order and separated by blank lines.

`When to use:` must describe a concise, specific scenario in one non-empty line. It must not give a command. `Example:` must contain only a non-empty fenced TypeScript code block. Write a complete, minimal code example rather than English prose.

Conventional leading `*` characters are allowed. The rule covers declarations, export lists, re-exports, default exports, and `export =`.

It reports: `Exports need structured JSDoc with a "Scope: public" or "Scope: private" section.`

## When to use it

Use it when every export must state whether it is public and public exports must show when and how to use them.

## Conformant

````ts
/**
 *
 * Scope: public
 *
 * When to use: Multiple consumers need the package's shared timeout value.
 *
 * Example:
 * ```ts
 * import { timeoutMs } from "./timeout.js"
 *
 * console.log(timeoutMs)
 * ```
 *
 */
export const timeoutMs = 1_000

/**

Scope: private

**/
export const timeoutSymbol = Symbol("timeout")
````

## Non-conformant

````ts
/**

Scope: private

When to use: Import this value.

**/
export const privateValue = 1

/**

Scope: public

When to use: Use it when needed.

Example: Import publicValue and then use it.

**/
export const publicValue = 2
````
