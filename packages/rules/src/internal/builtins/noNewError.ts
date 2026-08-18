import { Array, Option, Struct, flow, pipe, Schema } from "effect"
import * as ts from "typescript"
import { strictEqual } from "../equivalence.js"
import { nodeScanner } from "../scanner/nodeScanner.js"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"

// NoNewErrorFact exists because its fields form one stable data contract used by the linter.
export const NoNewErrorFact = Schema.Struct({})

export interface NoNewErrorFact extends Schema.Schema.Type<typeof NoNewErrorFact> {}

// emptyNoNewErrorFact exists because its fields form one stable data contract used by the linter.
export const emptyNoNewErrorFact = NoNewErrorFact.make({})

const isErrorIdentifier = flow(Struct.get<ts.Identifier, "text">("text"), strictEqual("Error"))

const newExpressionKinds = Array.of(ts.SyntaxKind.NewExpression)

const noNewErrorMatches = () => (node: ts.NewExpression) => {
  const isBareError = pipe(
    Option.liftPredicate(ts.isIdentifier)(node.expression),
    Option.exists(isErrorIdentifier)
  )

  if (!isBareError) {
    return Array.empty()
  }

  const match = makeNodeMatch(node, emptyNoNewErrorFact)

  return Array.of(match)
}

export const noNewErrorScanner = nodeScanner(newExpressionKinds)(ts.isNewExpression)(
  noNewErrorMatches
)
