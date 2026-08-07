import { noUnused } from "@better-typescript/guidance/preset/defaultWiring"
import { compilerOptionsForPolicies } from "@better-typescript/core/engine/policy/compilerOptionsForPolicies"

export const noUnusedCompilerOptions = compilerOptionsForPolicies([noUnused])
