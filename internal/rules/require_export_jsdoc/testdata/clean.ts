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
