import type * as ts from "typescript"
import type { RuleCheck, RuleContext, RuleMatch } from "./types.js"

// Constructors for the RuleCheck algebra. The listener structure is static
// (kinds are known without running anything) so the rule set stays compilable
// to a single-pass dispatch table. Handlers are free to be as effectful as they
// like internally; their scope is one node.

export const onNode = <N extends ts.Node>(
  kinds: ReadonlyArray<ts.SyntaxKind>,
  refine: (node: ts.Node) => node is N,
  handler: (node: N, context: RuleContext) => ReadonlyArray<RuleMatch>
): RuleCheck => [
  {
    _tag: "OnNode",
    kinds,
    handler: (node, context) => (refine(node) ? handler(node, context) : [])
  }
]

export const onFile = (
  handler: (context: RuleContext) => ReadonlyArray<RuleMatch>
): RuleCheck => [{ _tag: "OnFile", handler }]

export const combineAll = (checks: ReadonlyArray<RuleCheck>): RuleCheck => checks.flat()
