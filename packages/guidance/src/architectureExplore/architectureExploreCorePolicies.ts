import { Array } from "effect"
import type { Policy } from "@better-typescript/core/engine/policy/data"
import { passThroughWrappers } from "../policies/passThroughWrappers.js"
import { interfaceBurden } from "../policies/interfaceBurden.js"
import { moduleGraph } from "../policies/moduleGraph.js"
import { testOnlyExports } from "../policies/testOnlyExports.js"
import { seamLeakageEvidence } from "../policies/seamLeakageEvidence.js"
import { importUsage } from "../policies/importUsage.js"
import { moduleIdentity } from "../policies/moduleIdentity.js"
import { exportSurface } from "../policies/exportSurface.js"

export const architectureExploreCorePolicies: ReadonlyArray<Policy> = Array.make(
  passThroughWrappers,
  interfaceBurden,
  moduleGraph,
  testOnlyExports,
  seamLeakageEvidence,
  importUsage,
  moduleIdentity,
  exportSurface
)
