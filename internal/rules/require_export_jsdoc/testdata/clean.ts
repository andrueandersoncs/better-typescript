const local = 1

/**

Use when: callers need a shared value because the module owns its identity
across package boundaries.

Example: import { shared } from "./clean.js"
then pass shared to the consumer.

**/
export const shared = 2

const listed = 3
/**
 *
 * Use when: callers need the listed value because its local name is private.
 *
 * Example: import { listed } from "./clean.js"
 * and read listed directly.
 *
 */
export { listed }

/**

Use when:
Callers augment nested types because this namespace is the public extension point.

Example:
declare module "./clean.js" with an Outer.Inner augmentation.

**/
export namespace Outer.Inner {}
