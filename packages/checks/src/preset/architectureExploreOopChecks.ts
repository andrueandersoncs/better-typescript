import { Array } from "effect"
import type { NamedCheck } from "@better-typescript/core/engine/wiring/data"
import { externalDependencyConstruction } from "../checks/architectureExplore/externalDependencyConstruction.js"
import { singleAdapterSeams } from "../checks/architectureExplore/singleAdapterSeams.js"

// OOP evidence stays separate because constructor and implements seams belong to that paradigm.
export const architectureExploreOopChecks: ReadonlyArray<NamedCheck> = Array.make(
  externalDependencyConstruction,
  singleAdapterSeams
)
