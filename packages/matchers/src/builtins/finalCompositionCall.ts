import { Function, Option, pipe } from "effect"
import * as ts from "typescript"
import { expressionFromConciseBody } from "./expressionFromConciseBody.js"
import { nestedSingleParamArrow } from "./nestedSingleParamArrow.js"

export const finalCompositionCall = (arrow: ts.ArrowFunction): Option.Option<ts.CallExpression> =>
  pipe(
    expressionFromConciseBody(arrow.body),
    Option.flatMap((expression) => {
      const nestedCall = pipe(
        Option.some(expression),
        Option.filter(ts.isArrowFunction),
        Option.filter(nestedSingleParamArrow),
        Option.flatMap(finalCompositionCall)
      )

      const call = Option.liftPredicate(ts.isCallExpression)(expression)

      return pipe(nestedCall, Option.orElse(Function.constant(call)))
    })
  )
