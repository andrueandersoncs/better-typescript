import * as ts from "typescript"
import { strictEqual } from "../equivalence.js"
import { resultExpressions } from "./enclosingFunctionLike.js"
import type { FunctionDefinition } from "./functionDefinition.js"
import { flow, Struct, pipe, Option, Array } from "effect"

export const singleResultExpression = (definition: FunctionDefinition) => {
  const hasSingleExpression = flow(
    Struct.get<ReadonlyArray<ts.Expression>, "length">("length"),
    strictEqual(1)
  )

  return pipe(
    resultExpressions(definition),
    Option.liftPredicate(hasSingleExpression),
    Option.flatMap(Array.head)
  )
}
