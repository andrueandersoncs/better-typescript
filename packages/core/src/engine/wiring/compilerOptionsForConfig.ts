import { Array, flow } from "effect"
import type * as ts from "typescript"
import { compilerOptionsForPolicies } from "../policy/compilerOptionsForPolicies.js"
import { isProgramPolicy } from "./isProgramPolicy.js"
import type { WiringConfig } from "./wiringConfig.js"
import type { WiringEntry } from "./wiringEntry.js"

const programPoliciesFromEntry = (entry: WiringEntry) =>
  Array.filter(entry.wiring.policies, isProgramPolicy)

// Compiler options follow program Policy order because matchers own analysis semantics.
export const compilerOptionsForConfig: (config: WiringConfig) => ts.CompilerOptions = flow(
  Array.flatMap(programPoliciesFromEntry),
  compilerOptionsForPolicies
)
