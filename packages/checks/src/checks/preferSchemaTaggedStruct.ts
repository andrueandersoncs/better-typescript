import { Array, Function, Option, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { namedDetectionTarget } from "./support/tsNode.js"
import { dataTaggedClassHeritage, typeIsWireSafe } from "./support/taggedClassPortability.js"
import { makeCheck } from "../defineCheck.js"
import { makeDetection } from "@better-typescript/core/engine/check"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

const message = "Prefer Schema.TaggedStruct when every field has a portable wire representation."

const hint =
  "This Data.TaggedClass contains only wire-safe structural fields. When it crosses a reusable " +
  "boundary, define it with Schema.TaggedStruct and a same-named decoded interface. Compose " +
  "multiple boundary variants with Schema.TaggedUnion. Keep Data.TaggedClass for process-bound " +
  "values such as streams, effects, functions, compiler objects, and live handles, and use " +
  "Data.TaggedEnum for internal workflow decisions or state. Use Schema.TaggedErrorClass only " +
  "for typed errors."

const fieldsAreWireSafe = (checker: ts.TypeChecker) => (heritage: ts.ExpressionWithTypeArguments) =>
  pipe(
    Option.fromNullishOr(heritage.typeArguments),
    Option.getOrElse(Array.empty),
    Array.head,
    Option.match({
      onNone: Function.constant(true),
      onSome: (fieldsNode) => {
        const isEmptyLiteral = (literal: ts.TypeLiteralNode) =>
          strictEqual(literal.members.length, 0)

        return pipe(
          Option.liftPredicate(ts.isTypeLiteralNode)(fieldsNode),
          Option.filter(isEmptyLiteral),
          Option.match({
            onSome: Function.constant(true),
            onNone: () =>
              pipe(checker.getTypeFromTypeNode(fieldsNode), typeIsWireSafe(checker)(fieldsNode))
          })
        )
      }
    })
  )

const portableDataTaggedClassMatches = (context: CheckContext) => {
  const { checker } = context
  const match = makeDetection(context)

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

export const preferSchemaTaggedStruct = makeCheck(
  "prefer-schema-tagged-struct",
  classDeclarationKinds,
  ts.isClassDeclaration,
  portableDataTaggedClassMatches
)
