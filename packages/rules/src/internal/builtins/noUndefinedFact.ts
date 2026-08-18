import { Array, Function, Schema } from "effect"
import type * as ts from "typescript"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"
import { UndefinedUsageKind } from "./undefinedUsageKind.js"

// NoUndefinedFact exists because its fields form one stable data contract used by the linter.
export const NoUndefinedFact = Schema.Struct({
  kind: UndefinedUsageKind
})

export interface NoUndefinedFact extends Schema.Schema.Type<typeof NoUndefinedFact> {}

export const undefinedUsageMatches = (kind: UndefinedUsageKind) => {
  const matchUndefinedUsage = (node: ts.Node) => {
    const fact = NoUndefinedFact.make({ kind })
    const match = makeNodeMatch(node, fact)

    return Array.of(match)
  }

  return Function.constant(matchUndefinedUsage)
}
