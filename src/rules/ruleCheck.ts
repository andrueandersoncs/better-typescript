import type * as ts from "typescript"
import { FileListener, NodeListener } from "./types.js"
import type { NodeHandler, RuleCheck, RuleContext, RuleMatch } from "./types.js"

const refinedHandler =
  <N extends ts.Node>(refine: (node: ts.Node) => node is N) =>
  (
    handler: (context: RuleContext) => (node: N) => ReadonlyArray<RuleMatch>
  ): NodeHandler =>
  (context) =>
  (node) =>
    refine(node) ? handler(context)(node) : []

export const onNode =
  (kinds: ReadonlyArray<ts.SyntaxKind>) =>
  <N extends ts.Node>(refine: (node: ts.Node) => node is N) =>
  (
    handler: (context: RuleContext) => (node: N) => ReadonlyArray<RuleMatch>
  ): RuleCheck => [new NodeListener({ kinds, handler: refinedHandler(refine)(handler) })]

export const onFile = (
  handler: (context: RuleContext) => ReadonlyArray<RuleMatch>
): RuleCheck => [new FileListener({ handler })]

export const combineAll = (checks: ReadonlyArray<RuleCheck>): RuleCheck =>
  checks.flat()
