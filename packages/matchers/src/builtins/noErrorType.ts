import { Array, Option, Struct, flow, pipe, Schema } from "effect"
import * as ts from "typescript"
import { strictEqual } from "../equivalence.js"
import { nodeMatcher } from "../matcher/matcher.js"
import { makeNodeMatch, type MatchContext } from "../matcher/data.js"

// NoErrorTypeFact is empty payload because guidance and matchers share identity.
export const NoErrorTypeFact = Schema.Struct({})

export interface NoErrorTypeFact extends Schema.Schema.Type<typeof NoErrorTypeFact> {}

// emptyNoErrorTypeFact is the shared empty fact because guidance and matchers share identity.
export const emptyNoErrorTypeFact = NoErrorTypeFact.make({})

const errorTypeName = (typeName: ts.EntityName) =>
  ts.isIdentifier(typeName) ? typeName : typeName.right

const isErrorNamedTypeReference = flow(
  Struct.get<ts.TypeReferenceNode, "typeName">("typeName"),
  errorTypeName,
  Struct.get("text"),
  strictEqual("Error")
)

const isErrorTypeReference = (node: ts.Node): node is ts.TypeReferenceNode =>
  pipe(Option.liftPredicate(ts.isTypeReferenceNode)(node), Option.exists(isErrorNamedTypeReference))

const errorTypeMatches = (context: MatchContext) => {
  const checker = context.checker

  const globalErrorSymbol = pipe(
    checker.resolveName("Error", undefined, ts.SymbolFlags.Type, false),
    Option.fromNullishOr
  )

  const isGlobalErrorSymbol = (symbol: ts.Symbol) =>
    pipe(globalErrorSymbol, Option.exists(strictEqual(symbol)))

  const matchErrorTypeReference = (typeReference: ts.TypeReferenceNode) => {
    const typeName = errorTypeName(typeReference.typeName)
    const match = makeNodeMatch(typeName, emptyNoErrorTypeFact)

    return pipe(
      checker.getSymbolAtLocation(typeName),
      Option.fromNullishOr,
      Option.filter(isGlobalErrorSymbol),
      Option.as(match),
      Option.toArray
    )
  }

  return matchErrorTypeReference
}

const typeReferenceKinds = Array.of(ts.SyntaxKind.TypeReference)

export const noErrorTypeMatcher =
  nodeMatcher(typeReferenceKinds)(isErrorTypeReference)(errorTypeMatches)
