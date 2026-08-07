import { Array } from "effect"
import { conceptProliferation } from "../conceptControl/conceptProliferation.js"
import { highSignalDensity } from "../derive/highSignalDensity.js"
import { ruleDominance } from "../derive/ruleDominance.js"
import { sideEffectLaundering } from "../derive/sideEffectLaundering.js"
import { hotSubsystem } from "../hotSubsystem/hotSubsystem.js"
import { imperativeStateManager } from "../imperativeStateManager/imperativeStateManager.js"
import { pipelineHostile } from "../pipelineHostile/pipelineHostile.js"
import { systemicHotspots } from "../systemicHotspots/systemicHotspots.js"

// Dual production refs break exclusive-consumer ownership because leaf refs pin the catalog.
export const defaultAdviceLeafRefs = Array.make(
  conceptProliferation,
  highSignalDensity,
  ruleDominance,
  sideEffectLaundering,
  hotSubsystem,
  imperativeStateManager,
  pipelineHostile,
  systemicHotspots
)
