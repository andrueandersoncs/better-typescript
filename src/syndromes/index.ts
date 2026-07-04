import { Array } from "effect"
import { highMatchDensity } from "./highMatchDensity.js"
import { hotSubsystem } from "./hotSubsystem.js"
import { imperativeStateManager } from "./imperativeStateManager.js"
import { pipelineHostile } from "./pipelineHostile.js"
import { ruleDominance } from "./ruleDominance.js"
import { sideEffectLaundering } from "./sideEffectLaundering.js"
import { systemicHotspots } from "./systemicHotspots.js"
import { Syndrome, SyndromeRegistry } from "./types.js"

export const syndromeRegistry = new SyndromeRegistry({
  fileSyndromes: [
    imperativeStateManager,
    sideEffectLaundering,
    pipelineHostile
  ],
  fileFallbacks: [highMatchDensity],
  directorySyndromes: [hotSubsystem],
  projectSyndromes: [ruleDominance, systemicHotspots]
})

const fileLevelSyndromes = Array.appendAll(
  syndromeRegistry.fileSyndromes,
  syndromeRegistry.fileFallbacks
)

const withDirectorySyndromes = Array.appendAll(
  fileLevelSyndromes,
  syndromeRegistry.directorySyndromes
)

// Every summary detector, flat: the substrate for role/strata governance and the Detector union.
export const syndromes: ReadonlyArray<Syndrome> = Array.appendAll(
  withDirectorySyndromes,
  syndromeRegistry.projectSyndromes
)

export {
  Interpretation,
  Syndrome,
  SyndromeRegistry,
  findingFrom,
  hasMentionCycle,
  syndromeMentions
} from "./types.js"
export type { SyndromeLevel } from "./types.js"
export { Summary } from "./summary.js"
