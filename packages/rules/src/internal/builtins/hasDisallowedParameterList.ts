import { Array } from "effect"
import type * as ts from "typescript"
import { hasRestParameter } from "./hasRestParameter.js"
import { runtimeParameters } from "./runtimeParameters.js"

export const hasDisallowedParameterList = (declaration: ts.Node) => {
  const declarationHasRestParameter = hasRestParameter(declaration)
  const hasMultipleRuntimeParameters = runtimeParameters(declaration).length > 1
  const conditions = Array.make(declarationHasRestParameter, hasMultipleRuntimeParameters)

  return Array.some(conditions, Boolean)
}
