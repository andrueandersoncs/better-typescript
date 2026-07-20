import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeCheck } from "../defineCheck.js"
import { makeDetection } from "@better-typescript/core/engine/check"

const errorTypeName = (typeName: ts.EntityName) =>
  ts.isIdentifier(typeName) ? typeName : typeName.right

const isErrorNamedTypeReference = (typeReference: ts.TypeReferenceNode) =>
  errorTypeName(typeReference.typeName).text === "Error"

const isErrorTypeReference = (node: ts.Node): node is ts.TypeReferenceNode =>
  pipe(Option.liftPredicate(ts.isTypeReferenceNode)(node), Option.exists(isErrorNamedTypeReference))

const message = "Avoid the built-in Error type."

const hint =
  "Use a specific tagged error type for known failures, preserve the caller's error type with a " +
  "type parameter, or use unknown at an untyped boundary."

const errorTypeMatches = (context: CheckContext) => {
  const checker = context.checker
  const match = makeDetection(context)

  const globalErrorSymbol = pipe(
    checker.resolveName("Error", undefined, ts.SymbolFlags.Type, false),
    Option.fromNullishOr
  )

  const isSameSymbol = (left: ts.Symbol) => (right: ts.Symbol) => left === right

  const isGlobalErrorSymbol = (symbol: ts.Symbol) =>
    pipe(globalErrorSymbol, Option.exists(isSameSymbol(symbol)))

  const matches = (typeReference: ts.TypeReferenceNode): ReadonlyArray<Detection> => {
    const typeName = errorTypeName(typeReference.typeName)

    const errorTypeDetection = match({
      node: typeName,
      message,
      hint
    })

    return pipe(
      checker.getSymbolAtLocation(typeName),
      Option.fromNullishOr,
      Option.filter(isGlobalErrorSymbol),
      Option.as(errorTypeDetection),
      Option.toArray
    )
  }

  return matches
}

const typeReferenceKinds = Array.of(ts.SyntaxKind.TypeReference)

export const noErrorType = makeCheck(
  "no-error-type",
  typeReferenceKinds,
  isErrorTypeReference,
  errorTypeMatches
)
