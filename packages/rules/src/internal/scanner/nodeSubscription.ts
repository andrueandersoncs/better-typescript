import type * as ts from "typescript"
import { Match } from "./match.js"
import type { MatchContext } from "./matchContext.js"
import { Data } from "effect"

export type NodeHandler<Fact> = (
  context: MatchContext
) => (node: ts.Node) => ReadonlyArray<Match<Fact>>

// NodeSubscription carries syntax kinds because planners group scanners for fused dispatch.
export class NodeSubscription<Fact = unknown> extends Data.Class<{
  readonly kinds: ReadonlyArray<ts.SyntaxKind>
  readonly handler: NodeHandler<Fact>
}> {}
