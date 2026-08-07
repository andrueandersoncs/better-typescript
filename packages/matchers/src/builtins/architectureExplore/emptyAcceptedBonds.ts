import { Array } from "effect"
import { SemanticModuleAcceptedBondRecord } from "./semanticModuleAcceptedBondRecord.js"

const emptyAcceptedBondValues: ReadonlyArray<SemanticModuleAcceptedBondRecord> = Array.empty()
export const emptyAcceptedBonds = Object.freeze(emptyAcceptedBondValues)

export { emptyAcceptedBondValues }
