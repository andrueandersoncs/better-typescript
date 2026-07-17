import { Array } from "effect"
import type { NamedCheck } from "@better-typescript/core/engine/wiring/data"
import { passThroughWrappers } from "../checks/architectureExplore/passThroughWrappers.js"
import { interfaceBurden } from "../checks/architectureExplore/interfaceBurden.js"
import { moduleGraph } from "../checks/architectureExplore/moduleGraph.js"
import { testOnlyExports } from "../checks/architectureExplore/testOnlyExports.js"
import { seamLeakageEvidence } from "../checks/architectureExplore/seamLeakageEvidence.js"
import { importUsage } from "../checks/architectureExplore/importUsage.js"
import { moduleIdentity } from "../checks/architectureExplore/moduleIdentity.js"
import { exportSurface } from "../checks/architectureExplore/exportSurface.js"

// Paradigm-neutral evidence stays shared because both fleets join the same workspace graph.
export const architectureExploreCoreChecks: ReadonlyArray<NamedCheck> = Array.make(
  passThroughWrappers,
  interfaceBurden,
  moduleGraph,
  testOnlyExports,
  seamLeakageEvidence,
  importUsage,
  moduleIdentity,
  exportSurface
)
