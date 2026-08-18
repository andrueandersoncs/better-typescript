import * as ts from "typescript"
import { makeScannerFromSubscriptions } from "./makeScannerFromSubscriptions.js"
import { Match } from "./match.js"
import type { MatchContext } from "./matchContext.js"
import { nodeSubscriptions } from "./nodeSubscriptions.js"
import { Function, pipe } from "effect"

export const nodeScanner =
  (kinds: ReadonlyArray<ts.SyntaxKind>) =>
  <N extends ts.Node>(refine: (node: ts.Node) => node is N) =>
  <Fact>(handler: (context: MatchContext) => (node: N) => ReadonlyArray<Match<Fact>>) =>
    pipe(nodeSubscriptions(kinds)(refine)(handler), Function.constant, makeScannerFromSubscriptions)
