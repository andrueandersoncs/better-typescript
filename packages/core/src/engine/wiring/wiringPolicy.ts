import type { Policy } from "../policy/policyClass.js"
import type { WorkspacePolicy } from "../policy/workspacePolicyClass.js"

// WiringPolicy is the ordered policy union because one fleet can mix program and workspace stages.
export type WiringPolicy = Policy | WorkspacePolicy
