const local = 1

/**

Scope: private

**/
export const internalShared = local

const listed = 3
/**
 *
 * Scope: public
 *
 * When to use: The module's fixed listed value must cross a package boundary.
 *
 * Example:
 * ```ts
 * import { listed } from "./clean.js"
 *
 * Math.max(listed, 0)
 * ```
 *
 */
export { listed }

/**

Scope: public

When to use: A consumer needs to extend the public nested namespace.

Example:
```ts
import { Outer } from "./clean.js"

declare module "./clean.js" {
  namespace Outer.Inner {
    const value: string
  }
}
```

**/
export namespace Outer.Inner {}

/**
 *
 * Scope: public
 *
 * When to use: Consumers need this stable identifier across package boundaries.
 *
 * Example:
 * ```ts
 * import { exactWidth } from "./clean.js"
 *
 * setTimeout(onDone, exactWidth)
 * ```
 *
 */
export const exactWidth = 80

/**
 *
 * Scope: public
 *
 * When to use: Consumers need a stable package identifier across independent
 * service boundaries.
 *
 * Example:
 * ```ts
 * import { wrappedWithStars } from "./clean.js"
 *
 * cache.get(wrappedWithStars)
 * ```
 *
 */
export const wrappedWithStars = "stable"

/**

Scope: public

When to use: Consumers need a stable package identifier across independent
service boundaries.

Example:
```ts
import { wrappedWithoutStars } from "./clean.js"

cache.get(wrappedWithoutStars)
```

**/
export const wrappedWithoutStars = "stable"

/**
 *
 * Scope: public
 *
 * When to use: A probe that used console.log now needs a named scalar.
 *
 * Example:
 * ```ts
 * import { mentionedLog } from "./clean.js"
 *
 * const scalar = mentionedLog
 * ```
 *
 */
export const mentionedLog = "string"
