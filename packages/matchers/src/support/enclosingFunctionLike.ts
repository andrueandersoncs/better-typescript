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

export const ownedReturnExpressions = (definition: FunctionDefinition) => {
  const returnOwnedByDefinition = (statement: ts.ReturnStatement) => {
    const ownerIsDefinition = strictEqual(definition)

    return pipe(enclosingFunctionLike(statement), Option.exists(ownerIsDefinition))
  }

  const appendReturnedExpression =
    (expressions: ReadonlyArray<ts.Expression>) => (returned: ts.Expression) =>
      Array.append(expressions, returned)

  const collectOwnedReturn = (
    expressions: ReadonlyArray<ts.Expression>,
    node: ts.Node
  ): ReadonlyArray<ts.Expression> =>
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

  return Function.flip(foldAst(collectOwnedReturn))(emptyExpressions)
}

export const resultExpressions = (definition: FunctionDefinition): ReadonlyArray<ts.Expression> => {
  if (!definition.body) {
    return emptyExpressions
  }

  return ts.isBlock(definition.body)
    ? ownedReturnExpressions(definition)(definition.body)
    : Array.of(definition.body)
}
