import type { NodeTarget, PositionTarget } from "@better-typescript/core/linter"

// ViolationTarget exists because scanner matches share one node-or-position target algebra.
export type ViolationTarget = NodeTarget | PositionTarget
