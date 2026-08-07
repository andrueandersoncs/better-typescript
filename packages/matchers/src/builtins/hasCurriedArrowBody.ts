import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import { conciseArrowBody } from "../support/conciseArrowBody.js"
import { isFunctionInitializer } from "../support/isFunctionInitializer.js"
import { unwrapTransparentExpression } from "../support/transparentWrapper.js"
import { strictEqual } from "../equivalence.js"
import { hasRestParameter } from "./hasRestParameter.js"
import { runtimeParameters } from "./runtimeParameters.js"

export const hasCurriedArrowBody = (declaration: ts.Node) => {
  const parameters = runtimeParameters(declaration)
  const hasSingleRuntimeParameter = strictEqual(1)(parameters.length)
  const hasNoRestParameter = !hasRestParameter(declaration)
  const parameterChecks = Array.make(hasSingleRuntimeParameter, hasNoRestParameter)
  const hasCurriedParameterList = Array.every(parameterChecks, Boolean)

  const bodyIsFunctionInitializer = pipe(
    Option.liftPredicate(ts.isArrowFunction)(declaration),
    Option.flatMap(conciseArrowBody),
    Option.map(unwrapTransparentExpression),
    Option.exists(isFunctionInitializer)
  )

  const curriedInitializerChecks = Array.make(hasCurriedParameterList, bodyIsFunctionInitializer)

  return Array.every(curriedInitializerChecks, Boolean)
}
