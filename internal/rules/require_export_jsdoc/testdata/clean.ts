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
 * console.log(listed)
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
 * console.log(exactWidth)
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
 * console.log(wrappedWithStars)
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

console.log(wrappedWithoutStars)
```

**/
export const wrappedWithoutStars = "stable"
