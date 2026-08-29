export const undocumented = 1

/** Use when: callers need it. Example: import it. */
export const oneLine = 2

/**
 *
 * Use when: callers need this value.
 *
 */
export const missingExample = 3

/**

Use when:

Example: import emptyUse.

**/
export const emptyUse = 4

/**

Use when: callers need this value.

Example:

**/
export const emptyExample = 5

/**

Example: import reversed.

Use when: callers need this value.

**/
export const reversed = 6

/**

Use When: callers need this value.

Example: import wrongCase.

**/
export const wrongCase = 7

/**

Use when: callers need this value.
Example: import missingSeparator.

**/
export const missingSeparator = 8

const local = 9
type Local = number
export { local }
export type { Local }
export * from "./dependency.js"
export * as dependencyNamespace from "./dependency.js"
export default local
