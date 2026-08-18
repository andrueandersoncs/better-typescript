import { withProgramScannerIndex } from "../../scanner/withProgramScannerIndex.js"
import { EffectQualityIndex } from "./effectQualityIndex.js"

const isIdempotentOperationName = (operationName: string) =>
  /^(get|list|find|read|lookup|fetch|resolve|load|query|check)/i.test(operationName)

const buildEffectQualityIndex = () => new EffectQualityIndex({ isIdempotentOperationName })

export const makeEffectQualityScanner = withProgramScannerIndex(buildEffectQualityIndex)
