import { Array } from "effect"
import { isProgramPolicy } from "../../engine/wiring/isProgramPolicy.js"
import type { WiringPolicy } from "../../engine/wiring/wiringPolicy.js"
import { isWorkspacePolicy } from "../../engine/wiring/workspacePolicyInstance.js"

export const isWiringPolicyInstance = (value: unknown): value is WiringPolicy => {
  const programPolicy = isProgramPolicy(value)
  const workspacePolicy = isWorkspacePolicy(value)
  const conditions = Array.make(programPolicy, workspacePolicy)

  return Array.some(conditions, Boolean)
}
