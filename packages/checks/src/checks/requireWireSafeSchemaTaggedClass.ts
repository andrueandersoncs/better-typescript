import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { namedDetectionTarget } from "./support/tsNode.js"
import { schemaTaggedClassEncodedType, typeIsWireSafe } from "./support/taggedClassPortability.js"
import { makeCheck } from "../defineCheck.js"
import { makeDetection } from "@better-typescript/core/engine/check"

const message = "Require Schema.TaggedClass to have a portable encoded representation."

const hint =
  "At least one encoded field is not provably composed of strings, numbers, booleans, " +
  "null, arrays, tuples, or string/number-keyed structural records. Give it a transformation " +
  "with a portable encoded side, or use Data.TaggedClass when the value intentionally carries " +
  "process-bound state. Any, unknown, identity/self schemas, functions, symbols, bigint, " +
  "undefined, and opaque class instances do not establish a portable contract."

const schemaTaggedClassMatches = (context: CheckContext) => {
  const { checker } = context
  const match = makeDetection(context)

  const matches = (declaration: ts.ClassDeclaration): ReadonlyArray<Detection> =>
    pipe(
      schemaTaggedClassEncodedType(checker)(declaration),
      Option.filter((encodedType) => !typeIsWireSafe(checker)(declaration)(encodedType)),
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

export const requireWireSafeSchemaTaggedClass = makeCheck(
  "require-wire-safe-schema-tagged-class",
  classDeclarationKinds,
  ts.isClassDeclaration,
  schemaTaggedClassMatches
)
