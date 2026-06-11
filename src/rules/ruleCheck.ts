import type * as ts from "typescript"
import { FileListener, NodeListener } from "./types.js"
import type { RuleCheck, RuleContext, RuleMatch } from "./types.js"

// Constructors for the RuleCheck algebra. The listener structure is static
// (kinds are known without running anything) so the rule set stays compilable
// to a single-pass dispatch table. Handlers are free to be as effectful as they
// like internally; their scope is one node.

const refinedHandler =
  <N extends ts.Node>(
    refine: (node: ts.Node) => node is N,
    handler: (node: N, context: RuleContext) => ReadonlyArray<RuleMatch>
  ) =>
  (node: ts.Node, context: RuleContext): ReadonlyArray<RuleMatch> =>
    refine(node) ? handler(node, context) : []

export const onNode = <N extends ts.Node>(
  kinds: ReadonlyArray<ts.SyntaxKind>,
  refine: (node: ts.Node) => node is N,
  handler: (node: N, context: RuleContext) => ReadonlyArray<RuleMatch>
): RuleCheck => [new NodeListener({ kinds, handler: refinedHandler(refine, handler) })]

export const onFile = (
  handler: (context: RuleContext) => ReadonlyArray<RuleMatch>
): RuleCheck => [new FileListener({ handler })]

export const combineAll = (checks: ReadonlyArray<RuleCheck>): RuleCheck => checks.flat()
