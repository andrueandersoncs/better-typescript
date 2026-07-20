import { Array, Function, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { foldAst } from "@better-typescript/core/engine/sources"
import { symbolDeclaredInEffectPackage } from "./support/tsSignature.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { makeDetection } from "@better-typescript/core/engine/check"
import { makeCheck } from "../defineCheck.js"

const message = "Avoid binding an Effect only to yield* it."

const hint =
  "Write const result = yield* expression (or yield* expression when the result " +
  "is unused) instead of naming a temporary Effect and yielding that name. Keep " +
  "extracting nested call arguments into their own consts so no-nested-calls " +
  "stays satisfied."

const hasAsteriskToken = (node: ts.FunctionExpression | ts.YieldExpression) =>
  pipe(node.asteriskToken, Option.fromNullishOr, Option.isSome)

const lacksAsteriskToken = (node: ts.FunctionExpression | ts.YieldExpression) =>
  pipe(node.asteriskToken, Option.fromNullishOr, Option.isNone)

const isYieldStarOfIdentifier = (identifier: ts.Identifier) => {
  const yieldsIdentifier = (yieldExpression: ts.YieldExpression) =>
    yieldExpression.expression === identifier

  return pipe(
    Option.liftPredicate(ts.isYieldExpression)(identifier.parent),
    Option.filter(hasAsteriskToken),
    Option.exists(yieldsIdentifier)
  )
}

const preferDirectYieldMatches = (context: CheckContext) => {
  const checker = context.checker
  const match = makeDetection(context)

  const isEffectPropertyCall = (methodName: string) => (call: ts.CallExpression) => {
    const hasMethodName = (access: ts.PropertyAccessExpression) => access.name.text === methodName

    const isEffectRoot = (access: ts.PropertyAccessExpression) =>
      pipe(
        Option.liftPredicate(ts.isIdentifier)(access.expression),
        Option.map(Struct.get("text")),
        Option.exists((text) => text === "Effect")
      )

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

  const matches = (declaration: ts.VariableDeclaration): ReadonlyArray<Detection> =>
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
          const isSameSymbol = (candidate: ts.Symbol) => candidate === symbol

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
        const hasOneReference = references.length === 1

        yield* Option.liftPredicate((value: boolean) => value)(hasOneReference)

        const onlyReference = yield* Option.fromNullishOr(references[0])
        yield* Option.liftPredicate(isYieldStarOfIdentifier)(onlyReference)

        return match({
          node: name,
          message,
          hint
        })
      }),
      Option.toArray
    )

  return matches
}

const variableDeclarationKinds = Array.of(ts.SyntaxKind.VariableDeclaration)

export const preferDirectYield = makeCheck(
  "prefer-direct-yield",
  variableDeclarationKinds,
  ts.isVariableDeclaration,
  preferDirectYieldMatches
)
