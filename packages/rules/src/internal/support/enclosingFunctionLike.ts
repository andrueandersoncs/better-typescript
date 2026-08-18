import * as ts from "typescript"
import { strictEqual } from "../equivalence.js"
import { foldAst } from "../sources/foldAst.js"
import { emptyExpressions } from "./emptyExpressions.js"
import type { FunctionDefinition } from "./functionDefinition.js"
import { returnStatementExpression } from "./returnStatementExpression.js"
import { Option, pipe, Array, Function } from "effect"

export const enclosingFunctionLike = (node: ts.Node): Option.Option<ts.SignatureDeclaration> => {
  const parentFunctionLike = (parent: ts.Node): Option.Option<ts.SignatureDeclaration> =>
    ts.isFunctionLike(parent) ? Option.some(parent) : enclosingFunctionLike(parent)

  return pipe(Option.fromNullishOr(node.parent), Option.flatMap(parentFunctionLike))
}

export const ownedReturnExpressions = (scan: FunctionDefinition) => {
  const returnOwnedByDefinition = (statement: ts.ReturnStatement) => {
    const ownerIsDefinition = strictEqual(scan)

    return pipe(enclosingFunctionLike(statement), Option.exists(ownerIsDefinition))
  }

  const appendReturnedExpression =
    (expressions: ReadonlyArray<ts.Expression>) => (returned: ts.Expression) =>
      Array.append(expressions, returned)

  const collectOwnedReturn =
    (node: ts.Node) =>
    (expressions: ReadonlyArray<ts.Expression>): ReadonlyArray<ts.Expression> =>
      pipe(
        node,
        Option.liftPredicate(ts.isReturnStatement),
        Option.filter(returnOwnedByDefinition),
        Option.flatMap(returnStatementExpression),
        Option.match({
          onNone: Function.constant(expressions),
          onSome: appendReturnedExpression(expressions)
        })
      )

  const collectOwnedReturnFold = Function.untupled(
    ([expressions, node]: readonly [ReadonlyArray<ts.Expression>, ts.Node]) =>
      collectOwnedReturn(node)(expressions)
  )

  return Function.flip(foldAst(collectOwnedReturnFold))(emptyExpressions)
}

export const resultExpressions = (scan: FunctionDefinition): ReadonlyArray<ts.Expression> => {
  if (!scan.body) {
    return emptyExpressions
  }

  return ts.isBlock(scan.body) ? ownedReturnExpressions(scan)(scan.body) : Array.of(scan.body)
}
