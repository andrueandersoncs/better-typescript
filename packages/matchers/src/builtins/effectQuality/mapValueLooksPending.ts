import * as ts from "typescript"

import type { MatchContext } from "../../matcher/matchContext.js"

import { typeMentionsConstructor } from "./typeArgsOfTypeReference.js"

export const mapValueLooksPending = (context: MatchContext) => (expression: ts.NewExpression) => {
  const type = context.checker.getTypeAtLocation(expression)
  const mentions = typeMentionsConstructor(context.checker)
  const asPromise = mentions("Promise")(type)
  const asEffect = mentions("Effect")(type)

  return asPromise || asEffect
}
