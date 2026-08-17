import { Struct } from "effect"
import type { Policy } from "@better-typescript/core/engine/policy/policyClass"

export const policyName = Struct.get<Policy, "name">("name")
