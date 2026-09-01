export const undocumented = 1

/**

When to use: Import this value.

Example:
```ts
import { missingScope } from "./violation.js"
```

**/
export const missingScope = 2

/**

Scope: 'public'

**/
export const invalidScope = 3

/**

Scope: private

When to use: Import this internal value.

**/
export const privateWhen = 4

/**

Scope: private

Example:
```ts
import { privateExample } from "./violation.js"
```

**/
export const privateExample = 5

/**

Scope: public

Example:
```ts
import { missingWhen } from "./violation.js"
```

**/
export const missingWhen = 6

/**

Scope: public

When to use:
Import this value.

Example:
```ts
import { multilineWhen } from "./violation.js"
```

**/
export const multilineWhen = 7

/**

Scope: public

When to use: Import this value.

Example: Import proseExample from this module and call it.

**/
export const proseExample = 8

/**

Scope: public

When to use: Import this value.

Example:
```ts
```

**/
export const emptyExample = 9

/**

Scope: public

When to use: Import this value.

Example:
```text
import { wrongFence } from "./violation.js"
```

**/
export const wrongFence = 10

/**

Scope: public

Use when: callers need this value.

Example:
```ts
import { oldLabel } from "./violation.js"
```

**/
export const oldLabel = 11

const local = 12
type Local = number
export { local }
export type { Local }
export * from "./dependency.js"
export * as dependencyNamespace from "./dependency.js"
export default local

/**
 *
 * Scope: public
 *
 * When to use: Consumers need this runtime identifier across package boundaries.
 *
 * Example:
 * ```ts
 * import { overlongFirstLine } from "./violation.js"
 *
 * console.log(overlongFirstLine)
 * ```
 *
 */
export const overlongFirstLine = 13

/**
 *
 * Scope: public
 *
 * When to use:
 * Consumers need this runtime identifier across package boundaries and services.
 *
 * Example:
 * ```ts
 * import { overlongContinuation } from "./violation.js"
 *
 * console.log(overlongContinuation)
 * ```
 *
 */
export const overlongContinuation = 14

/**

Scope: public

When to use:

Example:
```ts
import { emptyWhen } from "./violation.js"

console.log(emptyWhen)
```

**/
export const emptyWhen = 15
