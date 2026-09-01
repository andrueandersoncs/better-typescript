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

When to use: Consumers need one stable identifier across independently deployed
services that share package data.

Example:
```ts
import { packageIdentifier } from "./package-identifier.js"

cache.get(packageIdentifier)
```

**/
export const packageIdentifier = "core"
````

`Scope:` must be the bare word `public` or `private`, without quotes. Private JSDoc must not include `When to use:` or `Example:`. Public JSDoc must include both sections in order and separated by blank lines.

`When to use:` must describe a concise, specific scenario. It must not give a command. The section may span consecutive lines, but every physical source line must end at or before column 80. Indentation and a conventional `* ` prefix count toward the limit. `Example:` must contain only a non-empty fenced TypeScript code block. Write a complete, minimal code example rather than English prose. Do not use `console.log`. Show ordinary use of the export: assign it, pass it, or return it.

Conventional leading `*` characters are allowed. The rule covers declarations, export lists, re-exports, default exports, and `export =`.

It reports: `Exports need structured JSDoc with a "Scope: public" or "Scope: private" section. Private exports must only declare their scope. Public exports also need a concise, specific scenario in the "When to use:" section. Wrap that section so no source line exceeds 80 columns. Public exports also need a complete, minimal TypeScript code example in a fenced "Example:" section. Do not use console.log. Show ordinary use of the export: assign it, pass it, or return it.`

## When to use it

Use it when every export must state whether it is public and public exports must show when and how to use them.

## Conformant

````ts
/**
 *
 * Scope: public
 *
 * When to use: Multiple consumers need the package timeout across independently
 * deployed services.
 *
 * Example:
 * ```ts
 * import { timeoutMs } from "./timeout.js"
 *
 * setTimeout(onDone, timeoutMs)
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

/**

Scope: public

When to use: Consumers need this runtime identifier across independent package boundaries.

Example:
```ts
import { overlongValue } from "./overlong-value.js"

console.log(overlongValue)
```

**/
export const overlongValue = 3

/**

Scope: public

When to use: Table field metadata needs a scalar schema for adapter columns.

Example:
```ts
import { TableFieldScalarSchema } from "./schemas.ts"

console.log(TableFieldScalarSchema.make("string"))
```

**/
export const TableFieldScalarSchema = "string"
````
