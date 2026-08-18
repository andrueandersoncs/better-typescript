import * as ts from "typescript"
import { strictEqual } from "../equivalence.js"
import { returnStatementExpression } from "./returnStatementExpression.js"
import { flow, Struct, pipe, Option, Array } from "effect"

export const singleStatementReturnExpression = (body: ts.Block) => {
  const hasSingleStatement = flow(
    Struct.get<ReadonlyArray<ts.Statement>, "length">("length"),
    strictEqual(1)
  )

  return pipe(
    body.statements,
    Option.liftPredicate(hasSingleStatement),
    Option.flatMap(Array.head),
    Option.filter(ts.isReturnStatement),
    Option.flatMap(returnStatementExpression)
  )
}
