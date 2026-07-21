import { Array } from "effect"
import type { Policy } from "@better-typescript/core/engine/policy/data"
import { externalDependencyConstruction } from "../policies/externalDependencyConstruction.js"
import { singleAdapterSeams } from "../policies/singleAdapterSeams.js"

export const architectureExploreOopPolicies: ReadonlyArray<Policy> = Array.make(
  externalDependencyConstruction,
  singleAdapterSeams
)
