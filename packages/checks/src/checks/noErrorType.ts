import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { defineCheck } from "../defineCheck.js"
import { detection } from "@better-typescript/core/engine/check"

const errorTypeName = (typeName: ts.EntityName) =>
  ts.isIdentifier(typeName) ? typeName : typeName.right

const isErrorTypeReference = (node: ts.Node): node is ts.TypeReferenceNode =>
  pipe(
    Option.liftPredicate(ts.isTypeReferenceNode)(node),
    Option.exists((typeReference) => errorTypeName(typeReference.typeName).text === "Error")
  )

const message = "Avoid the built-in Error type."

const hint =
  "Use a specific tagged error type for known failures, preserve the caller's error type with a " +
  "type parameter, or use unknown at an untyped boundary."

const errorTypeMatches = (context: CheckContext) => {
  const checker = context.checker
  const match = detection(context)

  const globalErrorSymbol = pipe(
    checker.resolveName("Error", undefined, ts.SymbolFlags.Type, false),
    Option.fromNullishOr
  )

  const matches = (typeReference: ts.TypeReferenceNode): ReadonlyArray<Detection> => {
    const typeName = errorTypeName(typeReference.typeName)

    return pipe(
      checker.getSymbolAtLocation(typeName),
      Option.fromNullishOr,
      Option.filter((symbol) => Option.exists(globalErrorSymbol, (global) => global === symbol)),
      Option.map(() =>
        match({
          node: typeName,
          message,
          hint
        })
      ),
      Option.toArray
    )
  }

  return matches
}

const typeReferenceKinds = Array.of(ts.SyntaxKind.TypeReference)

export const noErrorType = defineCheck(
  "no-error-type",
  typeReferenceKinds,
  isErrorTypeReference,
  errorTypeMatches
)
