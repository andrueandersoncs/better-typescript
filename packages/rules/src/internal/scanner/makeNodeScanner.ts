import * as ts from "typescript"
import { Scanner } from "./scannerData.js"
import { Match } from "./match.js"
import type { MatchContext } from "./matchContext.js"
import { nodeSubscriptions } from "./nodeSubscriptions.js"
import { Function } from "effect"

export const makeNodeScanner =
  (kinds: ReadonlyArray<ts.SyntaxKind>) =>
  <N extends ts.Node>(refine: (node: ts.Node) => node is N) =>
  <Fact>(handler: (context: MatchContext) => (node: N) => ReadonlyArray<Match<Fact>>) => {
    const subscriptions = nodeSubscriptions(kinds)(refine)(handler)

    return new Scanner({ plan: Function.constant(subscriptions) })
  }
