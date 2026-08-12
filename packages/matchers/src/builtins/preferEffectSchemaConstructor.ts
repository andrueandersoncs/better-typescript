import { Array, Function, HashSet, Option, Predicate, pipe, Struct, flow } from "effect"
import * as ts from "typescript"
import { strictEqual } from "../equivalence.js"
import { makeNodeMatch } from "../matcher/makeNodeMatch.js"
import type { MatchContext } from "../matcher/matchContext.js"
import { nodeMatcher } from "../matcher/nodeMatcher.js"
import { isReturnedExpressionNode } from "../support/isReturnedExpressionNode.js"
import { unwrapTransparentExpression } from "../support/transparentWrapper.js"
import { PreferEffectSchemaConstructorFact } from "./preferEffectSchemaConstructorFact.js"
import type { NamedVariableDeclaration } from "./preferEffectSchemaConstructorBinding.js"
import { hasForeignReturnContract } from "./preferEffectSchemaConstructorForeignReturn.js"
import { isNonEmptyObjectLiteral } from "./preferEffectSchemaConstructorObjectLiteral.js"
import { schemaConstructorTag } from "./preferEffectSchemaConstructorTag.js"

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

const branchExpressions = (expression: ts.Expression): ReadonlyArray<ts.Expression> => {
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

const objectLiteralReturnMatches = (context: MatchContext) => {
  const matches = (node: ts.Node) => {
    if (!isReturnedExpressionNode(node)) return Array.empty()

    const expression = ts.isReturnStatement(node)
      ? Option.fromNullishOr(node.expression)
      : Option.liftPredicate(ts.isExpression)((node as ts.ArrowFunction).body)

    return pipe(
      expression,
      Option.toArray,
      Array.flatMap(branchExpressions),
      Array.filter(ts.isObjectLiteralExpression),
      Array.filter(isNonEmptyObjectLiteral),
      Array.filter(Predicate.not(hasForeignReturnContract(context))),
      Array.map((literal) => {
        const tag = schemaConstructorTag(literal)
        const fact = PreferEffectSchemaConstructorFact.make({ tag })

        return makeNodeMatch(literal, fact)
      })
    )
  }

  return matches
}

const hasReturnedBindingName = (name: string) => (statement: ts.Statement) =>
  pipe(
    Option.liftPredicate(ts.isReturnStatement)(statement),
    Option.map(Struct.get<ts.ReturnStatement, "expression">("expression")),
    Option.flatMap(Option.fromNullishOr),
    Option.filter(ts.isIdentifier),
    Option.exists(flow(Struct.get<ts.Identifier, "text">("text"), strictEqual(name)))
  )

const isNamedVariableDeclaration = (
  declaration: ts.VariableDeclaration
): declaration is NamedVariableDeclaration => ts.isIdentifier(declaration.name)

const returnedBindingMatch = (declaration: NamedVariableDeclaration) =>
  Option.gen(function* () {
    const initializer = yield* Option.fromNullishOr(declaration.initializer)

    const literal = yield* pipe(
      unwrapTransparentExpression(initializer),
      Option.liftPredicate(ts.isObjectLiteralExpression),
      Option.filter(isNonEmptyObjectLiteral)
    )

    const block = yield* Option.liftPredicate(ts.isBlock)(declaration.parent.parent.parent)

    yield* pipe(block.statements, Array.findFirst(hasReturnedBindingName(declaration.name.text)))

    const tag = schemaConstructorTag(literal)
    const fact = PreferEffectSchemaConstructorFact.make({ tag })

    return makeNodeMatch(literal, fact)
  })

const returnedBindingMatches = (context: MatchContext) => (node: ts.Node) =>
  pipe(
    Option.liftPredicate(ts.isVariableDeclaration)(node),
    Option.filter(isNamedVariableDeclaration),
    Option.filter(Predicate.not(hasForeignReturnContract(context))),
    Option.flatMap(returnedBindingMatch),
    Option.toArray
  )

const returnCandidateKinds = Array.make(
  ts.SyntaxKind.ReturnStatement,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.VariableDeclaration
)

const isReturnCandidate = (
  node: ts.Node
): node is ts.ReturnStatement | ts.ArrowFunction | ts.VariableDeclaration =>
  isReturnedExpressionNode(node) || ts.isVariableDeclaration(node)

const matchReturnCandidate = (context: MatchContext) => (node: ts.Node) =>
  ts.isVariableDeclaration(node)
    ? returnedBindingMatches(context)(node)
    : objectLiteralReturnMatches(context)(node)

export const preferEffectSchemaConstructorMatcher =
  nodeMatcher(returnCandidateKinds)(isReturnCandidate)(matchReturnCandidate)
