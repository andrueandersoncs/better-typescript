import type { ProgramContext } from "../sources/data.js"
import { architectureEvidence } from "./architectureExplore/architectureEvidence.js"
import { evidenceFileMatcher } from "./evidenceFileMatcher.js"

const exportReferenceIndexFromContext = (context: ProgramContext) =>
  architectureEvidence(context).exportReferenceIndex

export const exportReferenceFileMatcher = evidenceFileMatcher(exportReferenceIndexFromContext)
