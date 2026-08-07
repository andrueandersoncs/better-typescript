import { Array } from "effect"
import { SemanticModuleSuppressedBondRecord } from "./semanticModuleSuppressedBondRecord.js"

const emptySuppressedBondValues: ReadonlyArray<SemanticModuleSuppressedBondRecord> = Array.empty()
export const emptySuppressedBonds = Object.freeze(emptySuppressedBondValues)

export { emptySuppressedBondValues }
