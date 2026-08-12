import { Array, Function, Match, Option, Predicate, Struct, pipe } from "effect"
import * as ts from "typescript"
import { strictEqual } from "../equivalence.js"
import type { MatchContext } from "../matcher/matchContext.js"
import { nodeMatcher } from "../matcher/nodeMatcher.js"
import { isReturnedExpressionNode } from "../support/isReturnedExpressionNode.js"
import { foldAst } from "../sources/foldAst.js"
import { unwrapTransparentExpression } from "../support/transparentWrapper.js"
import { branchExpressions } from "./preferEffectSchemaConstructorBranchExpressions.js"
import { makePreferEffectSchemaConstructorMatch } from "./preferEffectSchemaConstructorFact.js"
import type { NamedVariableDeclaration } from "./preferEffectSchemaConstructorBinding.js"
import { hasForeignReturnContract } from "./preferEffectSchemaConstructorForeignReturn.js"
import { isNonEmptyObjectLiteral } from "./preferEffectSchemaConstructorObjectLiteral.js"
import { symbolOptionAt } from "./symbolOptionAt.js"

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
      Array.map(makePreferEffectSchemaConstructorMatch)
    )
  }

  return matches
}

const isNamedVariableDeclaration = (
  declaration: ts.VariableDeclaration
): declaration is NamedVariableDeclaration => ts.isIdentifier(declaration.name)

const functionAncestorOf = (node: ts.Node) => ts.findAncestor(node, ts.isFunctionLike)

const conciseBodyFunctionChecks = (declaration: ts.SignatureDeclaration) => {
  const isArrow = ts.isArrowFunction(declaration)
  const isFunctionExpression = ts.isFunctionExpression(declaration)

  return Array.make(isArrow, isFunctionExpression)
}

const isConciseBodyFunction = (
  declaration: ts.SignatureDeclaration
): declaration is ts.ArrowFunction | ts.FunctionExpression =>
  pipe(conciseBodyFunctionChecks(declaration), Array.some(Boolean))

const blockBodyFunctionChecks = (declaration: ts.SignatureDeclaration) => {
  const isFunction = ts.isFunctionDeclaration(declaration)
  const isMethod = ts.isMethodDeclaration(declaration)
  const isGetter = ts.isGetAccessorDeclaration(declaration)
  const isSetter = ts.isSetAccessorDeclaration(declaration)
  const isConstructor = ts.isConstructorDeclaration(declaration)

  return Array.make(isFunction, isMethod, isGetter, isSetter, isConstructor)
}

const isBlockBodyFunction = (
  declaration: ts.SignatureDeclaration
): declaration is
  | ts.FunctionDeclaration
  | ts.MethodDeclaration
  | ts.GetAccessorDeclaration
  | ts.SetAccessorDeclaration
  | ts.ConstructorDeclaration => pipe(blockBodyFunctionChecks(declaration), Array.some(Boolean))

const conciseBody = (declaration: ts.ArrowFunction | ts.FunctionExpression) =>
  Option.some(declaration.body)

const blockBody = (
  declaration:
    | ts.FunctionDeclaration
    | ts.MethodDeclaration
    | ts.GetAccessorDeclaration
    | ts.SetAccessorDeclaration
    | ts.ConstructorDeclaration
) => Option.fromNullishOr(declaration.body)

const noImplementationBody = Option.none<ts.ConciseBody>()
const noImplementationBodyFallback = Function.constant(noImplementationBody)

const implementationBody = (declaration: ts.SignatureDeclaration) =>
  pipe(
    Match.value(declaration),
    Match.when(isConciseBodyFunction, conciseBody),
    Match.when(isBlockBodyFunction, blockBody),
    Match.orElse(noImplementationBodyFallback)
  )

const returnedBindingMatches = (context: MatchContext) => (node: ts.Node) =>
  pipe(
    Option.gen(function* () {
      const declaration = yield* pipe(
        Option.liftPredicate(ts.isVariableDeclaration)(node),
        Option.filter(isNamedVariableDeclaration),
        Option.filter(Predicate.not(hasForeignReturnContract(context)))
      )

      const initializer = yield* Option.fromNullishOr(declaration.initializer)

      const literals = pipe(
        branchExpressions(initializer),
        Array.filter(ts.isObjectLiteralExpression),
        Array.filter(isNonEmptyObjectLiteral)
      )

      yield* pipe(literals, Option.liftPredicate(Array.isReadonlyArrayNonEmpty))

      const declarationSymbol = yield* symbolOptionAt(context.checker)(declaration.name)
      const functionAncestor = yield* pipe(functionAncestorOf(declaration), Option.fromNullishOr)
      const body = yield* pipe(implementationBody(functionAncestor), Option.filter(ts.isBlock))
      const isFromAnalyzedBody = Function.flow(functionAncestorOf, strictEqual(functionAncestor))

      const isReturnedBinding = (candidate: ts.Node) =>
        pipe(
          Option.liftPredicate(ts.isReturnStatement)(candidate),
          Option.filter(isFromAnalyzedBody),
          Option.map(Struct.get<ts.ReturnStatement, "expression">("expression")),
          Option.flatMap(Option.fromNullishOr),
          Option.map(unwrapTransparentExpression),
          Option.filter(ts.isIdentifier),
          Option.flatMap(symbolOptionAt(context.checker)),
          Option.exists(strictEqual(declarationSymbol))
        )

      const retainFoundBinding = (found: boolean, candidate: ts.Node) =>
        found ? true : isReturnedBinding(candidate)

      const hasReturnedBinding = foldAst(retainFoundBinding)(body)(false)

      yield* pipe(body, Option.liftPredicate(Function.constant(hasReturnedBinding)))

      return Array.map(literals, makePreferEffectSchemaConstructorMatch)
    }),
    Option.getOrElse(Array.empty)
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
