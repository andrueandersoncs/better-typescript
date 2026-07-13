import { Array, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { foldAst } from "@better-typescript/core/engine/sources"
import { detection } from "@better-typescript/core/engine/location"
import { symbolDeclaredInEffectPackage } from "./support/tsSignature.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"

const message = "Avoid binding an Effect only to yield* it."

const hint =
  "Write const result = yield* expression (or yield* expression when the result " +
  "is unused) instead of naming a temporary Effect and yielding that name. Keep " +
  "extracting nested call arguments into their own consts so no-nested-calls " +
  "stays satisfied."

const isYieldStarOfIdentifier = (identifier: ts.Identifier): boolean =>
  pipe(
    Option.liftPredicate(ts.isYieldExpression)(identifier.parent),
    Option.filter((yieldExpression) =>
      pipe(Option.fromNullable(yieldExpression.asteriskToken), Option.isSome)
    ),
    Option.exists(
      (yieldExpression) => yieldExpression.expression === identifier
    )
  )

const preferDirectYieldMatches = (context: CheckContext) => {
  const checker = context.checker
  const match = detection(context)

  const isEffectPropertyCall =
    (methodName: string) =>
    (call: ts.CallExpression): boolean =>
      pipe(
        Option.some(call.expression),
        Option.filter(ts.isPropertyAccessExpression),
        Option.filter((access) => access.name.text === methodName),
        Option.filter((access) =>
          pipe(
            Option.liftPredicate(ts.isIdentifier)(access.expression),
            Option.exists((identifier) => identifier.text === "Effect")
          )
        ),
        Option.flatMap((access) =>
          pipe(checker.getSymbolAtLocation(access.name), Option.fromNullable)
        ),
        Option.exists(symbolDeclaredInEffectPackage)
      )

  const matches = (
    declaration: ts.VariableDeclaration
  ): ReadonlyArray<Detection> =>
    pipe(
      Option.gen(function* () {
        const declarationList = yield* Option.liftPredicate(
          ts.isVariableDeclarationList
        )(declaration.parent)

        const isConstList = (declarationList.flags & ts.NodeFlags.Const) !== 0

        yield* Option.liftPredicate((value: boolean) => value)(isConstList)

        const name = yield* Option.liftPredicate(ts.isIdentifier)(
          declaration.name
        )

        yield* Option.fromNullable(declaration.initializer)

        const generator = yield* pipe(
          Option.fromNullable(declaration.parent),
          Option.flatMap((start) => {
            const visit = (
              current: ts.Node
            ): Option.Option<ts.FunctionExpression> => {
              const starredGenerator = pipe(
                Option.liftPredicate(ts.isFunctionExpression)(current),
                Option.filter((expression) =>
                  pipe(
                    Option.fromNullable(expression.asteriskToken),
                    Option.isSome
                  )
                )
              )

              if (Option.isSome(starredGenerator)) {
                const currentGenerator = starredGenerator.value

                const parentCall = Option.liftPredicate(ts.isCallExpression)(
                  currentGenerator.parent
                )

                const isGenArgument = pipe(
                  parentCall,
                  Option.exists(isEffectPropertyCall("gen"))
                )

                const isFnArgument = pipe(
                  parentCall,
                  Option.map(Struct.get("expression")),
                  Option.filter(ts.isCallExpression),
                  Option.exists(isEffectPropertyCall("fn"))
                )

                const wrapFlags = Array.make(isGenArgument, isFnArgument)
                const wrapsEffectGenerator = Array.some(wrapFlags, Boolean)

                return wrapsEffectGenerator
                  ? Option.some(currentGenerator)
                  : Option.none()
              }

              const isArrow = ts.isArrowFunction(current)
              const isMethod = ts.isMethodDeclaration(current)
              const isFunctionDeclaration = ts.isFunctionDeclaration(current)

              const nonGeneratorFunctionExpression = pipe(
                Option.liftPredicate(ts.isFunctionExpression)(current),
                Option.filter((expression) =>
                  pipe(
                    Option.fromNullable(expression.asteriskToken),
                    Option.isNone
                  )
                ),
                Option.isSome
              )

              const nestedFunctionFlags = Array.make(
                isArrow,
                isMethod,
                isFunctionDeclaration,
                nonGeneratorFunctionExpression
              )

              const nestedNonGenerator = Array.some(
                nestedFunctionFlags,
                Boolean
              )

              if (nestedNonGenerator) {
                return Option.none()
              }

              return pipe(
                Option.fromNullable(current.parent),
                Option.flatMap(visit)
              )
            }

            return visit(start)
          })
        )

        const symbolCandidate = checker.getSymbolAtLocation(name)
        const symbol = yield* Option.fromNullable(symbolCandidate)
        const emptyReferences = Array.empty<ts.Identifier>()

        const appendMatchingReference = (
          references: ReadonlyArray<ts.Identifier>,
          node: ts.Node
        ): ReadonlyArray<ts.Identifier> =>
          pipe(
            Option.some(node),
            Option.filter((candidate) => candidate !== name),
            Option.filter(ts.isIdentifier),
            Option.flatMap((identifier) =>
              pipe(
                checker.getSymbolAtLocation(identifier),
                Option.fromNullable,
                Option.filter((candidate) => candidate === symbol),
                Option.map(() => Array.append(references, identifier))
              )
            ),
            Option.getOrElse(() => references)
          )

        const foldReferences = foldAst(appendMatchingReference)(generator)
        const references = foldReferences(emptyReferences)
        const hasOneReference = references.length === 1

        yield* Option.liftPredicate((value: boolean) => value)(hasOneReference)

        const onlyReference = yield* Option.fromNullable(references[0])
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

const check = nodeCheck(variableDeclarationKinds)(ts.isVariableDeclaration)(
  preferDirectYieldMatches
)

export const preferDirectYield: Check = check

export const preferDirectYieldExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("prefer-direct-yield")
