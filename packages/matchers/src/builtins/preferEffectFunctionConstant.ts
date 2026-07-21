import { Array, Function, HashSet, Option, pipe, Struct, flow, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { nodeMatch, type MatchContext } from "../matcher/data.js"
import {
  conciseArrowBody,
  declarationListIsConst,
  isFunctionInitializer,
  unwrapExpression,
  variableDeclarationNameIsIdentifier
} from "../support/tsNode.js"
import { strictEqual } from "../equivalence.js"

// PreferEffectFunctionConstantFact records thunk text because guidance quotes the body.
export const PreferEffectFunctionConstantFact = Schema.Struct({
  expressionText: Schema.String
})

export interface PreferEffectFunctionConstantFact extends Schema.Schema.Type<
  typeof PreferEffectFunctionConstantFact
> {}

const constantThunkKinds = Array.make(ts.SyntaxKind.ArrowFunction, ts.SyntaxKind.FunctionExpression)

const primitiveLiteralKinds = HashSet.make(
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.NumericLiteral,
  ts.SyntaxKind.BigIntLiteral,
  ts.SyntaxKind.TrueKeyword,
  ts.SyntaxKind.FalseKeyword,
  ts.SyntaxKind.NullKeyword
)

const emptyModifiers = Array.empty()

const fallbackModifiers = Function.constant(emptyModifiers)

const modifierIsAsync = flow(
  Struct.get<ts.ModifierLike, "kind">("kind"),
  strictEqual(ts.SyntaxKind.AsyncKeyword)
)

const hasElements = (items: ReadonlyArray<unknown>) => items.length > 0

const hasSingleElement = flow(
  Struct.get<ReadonlyArray<unknown>, "length">("length"),
  strictEqual(1)
)

const isEligibleFunction = (node: ts.Node) =>
  pipe(
    Option.liftPredicate(isFunctionInitializer)(node),
    Option.map((initializer) => {
      const modifiers = pipe(
        Option.gen(function* () {
          const nodeWithModifiers = yield* Option.liftPredicate(ts.canHaveModifiers)(initializer)
          const modifiers = ts.getModifiers(nodeWithModifiers)

          return yield* Option.fromNullishOr(modifiers)
        }),
        Option.getOrElse(fallbackModifiers)
      )

      const hasAsync = Array.some(modifiers, modifierIsAsync)

      const hasGenerator = pipe(
        Option.gen(function* () {
          const functionExpression = yield* Option.liftPredicate(ts.isFunctionExpression)(
            initializer
          )

          return yield* Option.fromNullishOr(functionExpression.asteriskToken)
        }),
        Option.isSome
      )

      const hasTypeParameters = pipe(
        Option.fromNullishOr(initializer.typeParameters),
        Option.exists(hasElements)
      )

      const hasNoParameters = strictEqual(0)(initializer.parameters.length)
      const eligibility = Array.make(hasNoParameters, !hasAsync, !hasGenerator, !hasTypeParameters)

      return Array.every(eligibility, Boolean)
    }),
    Option.getOrElse(Function.constFalse)
  )

const blockReturnedExpression = (body: ts.Block) =>
  Option.gen(function* () {
    yield* Option.liftPredicate(hasSingleElement)(body.statements)
    const statement = yield* Array.head(body.statements)
    const returnStatement = yield* Option.liftPredicate(ts.isReturnStatement)(statement)

    return yield* Option.fromNullishOr(returnStatement.expression)
  })

const constantThunkReturnedExpression = (node: ts.Node): Option.Option<ts.Expression> => {
  if (!isFunctionInitializer(node)) {
    return Option.none()
  }

  return ts.isArrowFunction(node)
    ? pipe(
        conciseArrowBody(node),
        Option.orElse(() =>
          pipe(
            Option.some(node.body),
            Option.filter(ts.isBlock),
            Option.flatMap(blockReturnedExpression)
          )
        )
      )
    : blockReturnedExpression(node.body)
}

const isPrimitiveLiteralExpression = (expression: ts.Expression) => {
  const unwrapped = unwrapExpression(expression)

  return HashSet.has(primitiveLiteralKinds, unwrapped.kind)
}

const variableDeclarationList = (declaration: ts.VariableDeclaration) =>
  pipe(Option.some(declaration.parent), Option.filter(ts.isVariableDeclarationList))

const declarationListHasSingleDeclaration = (declarationList: ts.VariableDeclarationList) =>
  hasSingleElement(declarationList.declarations)

const functionConstantMatches = (context: MatchContext) => {
  const matches = (node: ts.Node) => {
    const declarationIsInSourceFile = flow(
      (candidate: ts.Declaration) => candidate.getSourceFile(),
      strictEqual(context.sourceFile)
    )

    const declarationPrecedesNode = (candidate: ts.VariableDeclaration) =>
      candidate.end <= node.getStart(context.sourceFile)

    const identifierIsStableConst = (identifier: ts.Identifier) =>
      pipe(
        Option.gen(function* () {
          const symbolCandidate = context.checker.getSymbolAtLocation(identifier)
          const symbol = yield* Option.fromNullishOr(symbolCandidate)
          const declarationCandidates = symbol.getDeclarations()
          const declarations = yield* Option.fromNullishOr(declarationCandidates)

          yield* Option.liftPredicate(hasSingleElement)(declarations)
          const declaration = yield* Array.head(declarations)

          const variableDeclaration = yield* Option.liftPredicate(ts.isVariableDeclaration)(
            declaration
          )

          yield* Option.liftPredicate(variableDeclarationNameIsIdentifier)(variableDeclaration)
          yield* Option.liftPredicate(declarationIsInSourceFile)(variableDeclaration)
          yield* Option.liftPredicate(declarationPrecedesNode)(variableDeclaration)

          yield* pipe(
            Option.some(variableDeclaration),
            Option.flatMap(variableDeclarationList),
            Option.filter(declarationListIsConst),
            Option.filter(declarationListHasSingleDeclaration)
          )

          return variableDeclaration
        }),
        Option.isSome
      )

    return pipe(
      Option.gen(function* () {
        yield* Option.liftPredicate(isEligibleFunction)(node)

        const expression = yield* pipe(
          Option.some(node),
          Option.flatMap(constantThunkReturnedExpression)
        )

        const unwrapped = unwrapExpression(expression)

        const isPrimitive = pipe(
          Option.some(unwrapped),
          Option.filter(isPrimitiveLiteralExpression),
          Option.isSome
        )

        const isStableIdentifier = pipe(
          Option.liftPredicate(ts.isIdentifier)(unwrapped),
          Option.exists(identifierIsStableConst)
        )

        const constantExpressionFlags = Array.make(isPrimitive, isStableIdentifier)
        const isConstantExpression = Array.some(constantExpressionFlags, Boolean)

        yield* Option.liftPredicate(Function.constant(isConstantExpression))(expression)
        const expressionText = expression.getText(context.sourceFile)
        const fact = PreferEffectFunctionConstantFact.make({ expressionText })

        return nodeMatch(node, fact)
      }),
      Option.toArray
    )
  }

  return matches
}

export const preferEffectFunctionConstantMatcher =
  nodeMatcher(constantThunkKinds)(isFunctionInitializer)(functionConstantMatches)
