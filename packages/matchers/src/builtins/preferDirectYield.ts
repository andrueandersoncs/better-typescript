import { Array, Function, Option, pipe, Struct, flow, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { nodeMatch, type MatchContext } from "../matcher/data.js"
import { foldAst } from "../sources/sources.js"
import { symbolDeclaredInEffectPackage } from "../support/tsSignature.js"
import { strictEqual } from "../equivalence.js"

// PreferDirectYieldFact is empty payload because guidance and matchers share identity.
export const PreferDirectYieldFact = Schema.Struct({})

export interface PreferDirectYieldFact extends Schema.Schema.Type<typeof PreferDirectYieldFact> {}

// emptyPreferDirectYieldFact is the shared empty fact because guidance and matchers share identity.
export const emptyPreferDirectYieldFact = PreferDirectYieldFact.make({})

const hasAsteriskToken = (node: ts.FunctionExpression | ts.YieldExpression) =>
  pipe(node.asteriskToken, Option.fromNullishOr, Option.isSome)

const lacksAsteriskToken = (node: ts.FunctionExpression | ts.YieldExpression) =>
  pipe(node.asteriskToken, Option.fromNullishOr, Option.isNone)

const isYieldStarOfIdentifier = (identifier: ts.Identifier) => {
  const yieldsIdentifier = flow(
    Struct.get<ts.YieldExpression, "expression">("expression"),
    strictEqual(identifier)
  )

  return pipe(
    Option.liftPredicate(ts.isYieldExpression)(identifier.parent),
    Option.filter(hasAsteriskToken),
    Option.exists(yieldsIdentifier)
  )
}

const variableDeclarationKinds = Array.of(ts.SyntaxKind.VariableDeclaration)

const matches = (context: MatchContext) => {
  const checker = context.checker

  const isEffectPropertyCall = (methodName: string) => (call: ts.CallExpression) => {
    const hasMethodName = (access: ts.PropertyAccessExpression) =>
      strictEqual(methodName)(access.name.text)

    const isEffectRoot = (access: ts.PropertyAccessExpression) => {
      const isEffectText = strictEqual("Effect")

      return pipe(
        Option.liftPredicate(ts.isIdentifier)(access.expression),
        Option.map(Struct.get("text")),
        Option.exists(isEffectText)
      )
    }

    const symbolAtAccessName = (access: ts.PropertyAccessExpression) =>
      pipe(checker.getSymbolAtLocation(access.name), Option.fromNullishOr)

    return pipe(
      Option.some(call.expression),
      Option.filter(ts.isPropertyAccessExpression),
      Option.filter(hasMethodName),
      Option.filter(isEffectRoot),
      Option.flatMap(symbolAtAccessName),
      Option.exists(symbolDeclaredInEffectPackage)
    )
  }

  const matchVariableDeclaration = (declaration: ts.VariableDeclaration) =>
    pipe(
      Option.gen(function* () {
        const declarationList = yield* Option.liftPredicate(ts.isVariableDeclarationList)(
          declaration.parent
        )

        const isConstList = (declarationList.flags & ts.NodeFlags.Const) !== 0

        yield* Option.liftPredicate((value: boolean) => value)(isConstList)

        const name = yield* Option.liftPredicate(ts.isIdentifier)(declaration.name)

        yield* Option.fromNullishOr(declaration.initializer)

        const generator = yield* pipe(
          Option.fromNullishOr(declaration.parent),
          Option.flatMap((start) => {
            const visit = (current: ts.Node): Option.Option<ts.FunctionExpression> => {
              const starredGenerator = pipe(
                Option.liftPredicate(ts.isFunctionExpression)(current),
                Option.filter(hasAsteriskToken)
              )

              if (Option.isSome(starredGenerator)) {
                const currentGenerator = starredGenerator.value

                const parentCall = Option.liftPredicate(ts.isCallExpression)(
                  currentGenerator.parent
                )

                const isGenArgument = pipe(parentCall, Option.exists(isEffectPropertyCall("gen")))

                const isFnArgument = pipe(
                  parentCall,
                  Option.map(Struct.get("expression")),
                  Option.filter(ts.isCallExpression),
                  Option.exists(isEffectPropertyCall("fn"))
                )

                const wrapFlags = Array.make(isGenArgument, isFnArgument)
                const wrapsEffectGenerator = Array.some(wrapFlags, Boolean)

                return wrapsEffectGenerator ? Option.some(currentGenerator) : Option.none()
              }

              const isArrow = ts.isArrowFunction(current)
              const isMethod = ts.isMethodDeclaration(current)
              const isFunctionDeclaration = ts.isFunctionDeclaration(current)

              const nonGeneratorFunctionExpression = pipe(
                Option.liftPredicate(ts.isFunctionExpression)(current),
                Option.filter(lacksAsteriskToken),
                Option.isSome
              )

              const nestedFunctionFlags = Array.make(
                isArrow,
                isMethod,
                isFunctionDeclaration,
                nonGeneratorFunctionExpression
              )

              const nestedNonGenerator = Array.some(nestedFunctionFlags, Boolean)

              return nestedNonGenerator
                ? Option.none()
                : pipe(Option.fromNullishOr(current.parent), Option.flatMap(visit))
            }

            return visit(start)
          })
        )

        const symbolCandidate = checker.getSymbolAtLocation(name)
        const symbol = yield* Option.fromNullishOr(symbolCandidate)
        const emptyReferences = Array.empty<ts.Identifier>()

        const appendMatchingReference = (
          references: ReadonlyArray<ts.Identifier>,
          node: ts.Node
        ): ReadonlyArray<ts.Identifier> => {
          const isNotBindingName = (candidate: ts.Node) => candidate !== name
          const isSameSymbol = strictEqual(symbol)

          const appendIdentifier = (identifier: ts.Identifier) =>
            Array.append(references, identifier)

          const matchingIdentifier = (identifier: ts.Identifier) =>
            pipe(
              checker.getSymbolAtLocation(identifier),
              Option.fromNullishOr,
              Option.filter(isSameSymbol),
              Option.as(identifier)
            )

          return pipe(
            Option.some(node),
            Option.filter(isNotBindingName),
            Option.filter(ts.isIdentifier),
            Option.flatMap(matchingIdentifier),
            Option.map(appendIdentifier),
            Option.getOrElse(Function.constant(references))
          )
        }

        const foldReferences = foldAst(appendMatchingReference)(generator)
        const references = foldReferences(emptyReferences)
        const hasOneReference = strictEqual(1)(references.length)

        yield* Option.liftPredicate((value: boolean) => value)(hasOneReference)

        const onlyReference = yield* Array.head(references)
        yield* Option.liftPredicate(isYieldStarOfIdentifier)(onlyReference)

        return nodeMatch(name, emptyPreferDirectYieldFact)
      }),
      Option.toArray
    )

  return matchVariableDeclaration
}

export const preferDirectYieldMatcher = nodeMatcher(variableDeclarationKinds)(
  ts.isVariableDeclaration
)(matches)
