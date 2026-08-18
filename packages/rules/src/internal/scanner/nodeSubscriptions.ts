import * as ts from "typescript"
import { Match } from "./match.js"
import type { MatchContext } from "./matchContext.js"
import { NodeSubscription } from "./nodeSubscription.js"
import type { Subscription } from "./subscription.js"
import { Array } from "effect"

export const nodeSubscriptions =
  (kinds: ReadonlyArray<ts.SyntaxKind>) =>
  <N extends ts.Node>(refine: (node: ts.Node) => node is N) =>
  <Fact>(
    handler: (context: MatchContext) => (node: N) => ReadonlyArray<Match<Fact>>
  ): ReadonlyArray<Subscription<Fact>> => {
    const wrapped = (context: MatchContext) => {
      const elements = handler(context)

      const refined = (node: ts.Node): ReadonlyArray<Match<Fact>> =>
        refine(node) ? elements(node) : Array.empty()

      return refined
    }

    const subscription = new NodeSubscription({ kinds, handler: wrapped })

    return Array.of(subscription)
  }
