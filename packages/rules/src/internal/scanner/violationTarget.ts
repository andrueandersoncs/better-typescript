import type { NodeTarget } from "./nodeTarget.js"
import type { PositionTarget } from "./positionTarget.js"

// ViolationTarget exists because its fields form one stable data contract used by the linter.
export type ViolationTarget = NodeTarget | PositionTarget
