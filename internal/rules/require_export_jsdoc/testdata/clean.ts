const local = 1

/** Use this export when callers need the shared value. */
export const shared = 2

const listed = 3
/** Use this export when callers need the listed value. */
export { listed }

/** Use this namespace when callers augment its nested types. */
export namespace Outer.Inner {}
