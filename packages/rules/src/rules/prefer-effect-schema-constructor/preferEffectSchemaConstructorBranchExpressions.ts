import { Array, Function, HashSet, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { unwrapTransparentExpression } from "../../internal/support/transparentWrapper.js"

const shortCircuitOperatorKinds = HashSet.make(
  ts.SyntaxKind.QuestionQuestionToken,
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.AmpersandAmpersandToken
)

const hasShortCircuitOperator = (expression: ts.BinaryExpression) =>
  HashSet.has(shortCircuitOperatorKinds, expression.operatorToken.kind)

const isShortCircuitExpression = (expression: ts.Expression): expression is ts.BinaryExpression => {
  const binaryExpression = Option.liftPredicate(ts.isBinaryExpression)(expression)

  return Option.exists(binaryExpression, hasShortCircuitOperator)
}

const ternaryBranches = (conditional: ts.ConditionalExpression): ReadonlyArray<ts.Expression> => {
  const ternaryArms = Array.make(conditional.whenTrue, conditional.whenFalse)

  return Array.flatMap(ternaryArms, branchExpressions)
}

export const branchExpressions = (expression: ts.Expression): ReadonlyArray<ts.Expression> => {
  const unwrapped = unwrapTransparentExpression(expression)

  const ternaryBranchOption = pipe(
    Option.liftPredicate(ts.isConditionalExpression)(unwrapped),
    Option.map(ternaryBranches)
  )

  const shortCircuitBranchOption = pipe(
    Option.liftPredicate(isShortCircuitExpression)(unwrapped),
    Option.map(Struct.get("right")),
    Option.map(branchExpressions)
  )

  const branches = Array.make(ternaryBranchOption, shortCircuitBranchOption)
  const leafBranches = Array.of(unwrapped)

  return pipe(Option.firstSomeOf(branches), Option.getOrElse(Function.constant(leafBranches)))
}
