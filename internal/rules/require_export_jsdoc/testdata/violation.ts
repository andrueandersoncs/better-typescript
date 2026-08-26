export const undocumented = 1

/** A documented value. */
export const missingUsageGuidance = 2

const local = 3
type Local = number
export { local }
export type { Local }
export * from "./dependency.js"
export * as dependencyNamespace from "./dependency.js"
export default local
