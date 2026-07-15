import { Array, Function, Option, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"
import { fixtureRefactorExamples } from "../fixtureExamples.js"
import { namedDetectionTarget } from "./support/tsNode.js"
import { dataTaggedClassHeritage, typeIsWireSafe } from "./taggedClassPortability.js"
import { nodeCheck, detection } from "@better-typescript/core/engine/check"

const message = "Prefer Schema.TaggedClass when every field has a portable wire representation."

const hint =
  "This Data.TaggedClass contains only wire-safe structural fields. Define those fields " +
  "with Schema and extend Schema.TaggedClass so construction, validation, encoding, and " +
  "decoding share one contract. Reserve Data.TaggedClass for process-bound values such as " +
  "streams, effects, functions, compiler objects, and live handles."

const fieldsAreWireSafe =
  (checker: ts.TypeChecker) =>
  (heritage: ts.ExpressionWithTypeArguments): boolean =>
    pipe(
      Option.fromNullable(heritage.typeArguments),
      Option.getOrElse(Array.empty),
      Array.head,
      Option.match({
        onNone: Function.constant(true),
        onSome: (fieldsNode) =>
          pipe(
            Option.liftPredicate(ts.isTypeLiteralNode)(fieldsNode),
            Option.filter((literal) => literal.members.length === 0),
            Option.match({
              onSome: Function.constant(true),
              onNone: () =>
                pipe(checker.getTypeFromTypeNode(fieldsNode), typeIsWireSafe(checker)(fieldsNode))
            })
          )
      })
    )

const portableDataTaggedClassMatches = (context: CheckContext) => {
  const { checker } = context
  const match = detection(context)

  const matches = (declaration: ts.ClassDeclaration): ReadonlyArray<Detection> =>
    pipe(
      dataTaggedClassHeritage(checker)(declaration),
      Option.filter(fieldsAreWireSafe(checker)),
      Option.map(() => {
        const node = namedDetectionTarget(declaration)

        return match({
          node,
          message,
          hint
        })
      }),
      Option.toArray
    )

  return matches
}

const classDeclarationKinds = Array.of(ts.SyntaxKind.ClassDeclaration)

export const preferSchemaTaggedClass: Check = nodeCheck(classDeclarationKinds)(
  ts.isClassDeclaration
)(portableDataTaggedClassMatches)

export const preferSchemaTaggedClassExamples: NonEmptyRefactorExamples = fixtureRefactorExamples(
  "prefer-schema-tagged-class"
)
