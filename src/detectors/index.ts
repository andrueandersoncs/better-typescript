import { Array, Struct } from "effect"
import { rules } from "../rules/index.js"
import type { Rule } from "../rules/types.js"
import type { DetectorRole } from "../rules/types.js"
import { syndromes } from "../syndromes/index.js"
import type { Syndrome } from "../syndromes/types.js"

// The unified species (adrs/0003): one interface — id, role, level, findings out — realized by two recognizer kinds. Rules are node-level detectors compiled to AST listeners; syndromes are summary detectors whose sentences the scheduler evaluates over the finding tree. Both are atoms of the matcher language via FindingOf.
export type Detector = Rule | Syndrome

export const detectors: ReadonlyArray<Detector> = Array.appendAll(
  rules,
  syndromes
)

export const detectorRole: (detector: Detector) => DetectorRole =
  Struct.get("role")

export const detectorId: (detector: Detector) => string = Struct.get("id")
