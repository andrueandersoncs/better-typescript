import { Struct } from "effect"
import type { Policy } from "./policyClass.js"

export const policyMatcher = Struct.get<Policy, "matcher">("matcher")
