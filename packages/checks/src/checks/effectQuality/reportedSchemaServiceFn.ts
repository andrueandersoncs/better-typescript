import { Array } from "effect"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type * as ts from "typescript"
import type { EffectQualityIndex } from "./index.js"
import type { EffectQualityRuleFinding } from "./findings.js"
import { exportedEffectFunctionFindings } from "./reportedSchemaExportedEffectFn.js"
import { contextServiceFindings } from "./reportedSchemaServiceMethod.js"

export const serviceMethodEffectFnFindings = (
  context: CheckContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> => {
  const serviceClass = contextServiceFindings(context, node)
  const exportedFunctions = exportedEffectFunctionFindings(context, node)

  return Array.appendAll(serviceClass, exportedFunctions)
}
