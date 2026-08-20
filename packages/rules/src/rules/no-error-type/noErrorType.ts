import { Array, Option, Struct, flow, pipe, Schema } from "effect"
import * as ts from "typescript"
import { strictEqual } from "../../internal/equivalence.js"
import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../../internal/scanner/makeNodeMatch.js"
import type { MatchContext } from "../../internal/scanner/matchContext.js"
import { errorTypeName } from "./errorTypeName.js"

// NoErrorTypeFact exists because its fields form one stable data contract used by the linter.
export const NoErrorTypeFact = Schema.Struct({})

export interface NoErrorTypeFact extends Schema.Schema.Type<typeof NoErrorTypeFact> {}

// emptyNoErrorTypeFact exists because its fields form one stable data contract used by the linter.
export const emptyNoErrorTypeFact = NoErrorTypeFact.make({})

const isErrorNamedTypeReference = flow(
  Struct.get<ts.TypeReferenceNode, "typeName">("typeName"),
  errorTypeName,
  Struct.get("text"),
  strictEqual("Error")
)

const isErrorTypeReference = (node: ts.Node): node is ts.TypeReferenceNode =>
  pipe(Option.liftPredicate(ts.isTypeReferenceNode)(node), Option.exists(isErrorNamedTypeReference))

const errorTypeMatches = (context: MatchContext) => {
  const globalErrorSymbol = pipe(
    context.checker.resolveName("Error", undefined, ts.SymbolFlags.Type, false),
    Option.fromNullishOr
  )

  const isGlobalErrorSymbol = (symbol: ts.Symbol) =>
    pipe(globalErrorSymbol, Option.exists(strictEqual(symbol)))

  const matchErrorTypeReference = (typeReference: ts.TypeReferenceNode) => {
    const typeName = errorTypeName(typeReference.typeName)
    const match = makeNodeMatch(typeName, emptyNoErrorTypeFact)

    return pipe(
      context.checker.getSymbolAtLocation(typeName),
      Option.fromNullishOr,
      Option.filter(isGlobalErrorSymbol),
      Option.as(match),
      Option.toArray
    )
  }

  return matchErrorTypeReference
}

const typeReferenceKinds = Array.of(ts.SyntaxKind.TypeReference)

export const noErrorTypeScanner =
  makeNodeScanner(typeReferenceKinds)(isErrorTypeReference)(errorTypeMatches)
