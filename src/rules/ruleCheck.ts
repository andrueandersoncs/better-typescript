import { Function } from "effect"
import type * as ts from "typescript"
import { FileListener, NodeListener } from "./types.js"
import type {
  NodeHandler,
  ProgramContext,
  RuleCheck,
  RuleContext,
  RuleListener,
  RuleMatch
} from "./types.js"

// Applying handler(context) outside the per-node lambda lets the dispatcher's once-per-file specialization reach the rule's context stage.
const refinedHandler =
  <N extends ts.Node>(refine: (node: ts.Node) => node is N) =>
  (
    handler: (context: RuleContext) => (node: N) => ReadonlyArray<RuleMatch>
  ): NodeHandler =>
  (context) => {
    const matches = handler(context)
    const refined = (node: ts.Node): ReadonlyArray<RuleMatch> =>
      refine(node) ? matches(node) : []

    return refined
  }

export const nodeListeners =
  (kinds: ReadonlyArray<ts.SyntaxKind>) =>
  <N extends ts.Node>(refine: (node: ts.Node) => node is N) =>
  (
    handler: (context: RuleContext) => (node: N) => ReadonlyArray<RuleMatch>
  ): ReadonlyArray<RuleListener> => [
    new NodeListener({ kinds, handler: refinedHandler(refine)(handler) })
  ]

export const fileListeners = (
  handler: (context: RuleContext) => ReadonlyArray<RuleMatch>
): ReadonlyArray<RuleListener> => [new FileListener({ handler })]

export const onNode =
  (kinds: ReadonlyArray<ts.SyntaxKind>) =>
  <N extends ts.Node>(refine: (node: ts.Node) => node is N) =>
  (
    handler: (context: RuleContext) => (node: N) => ReadonlyArray<RuleMatch>
  ): RuleCheck => {
    const listeners = nodeListeners(kinds)(refine)(handler)

    return Function.constant(listeners)
  }

export const onFile = (
  handler: (context: RuleContext) => ReadonlyArray<RuleMatch>
): RuleCheck => {
  const listeners = fileListeners(handler)

  return Function.constant(listeners)
}

const applyCheck =
  (context: ProgramContext) =>
  (check: RuleCheck): ReadonlyArray<RuleListener> =>
    check(context)

export const combineAll =
  (checks: ReadonlyArray<RuleCheck>): RuleCheck =>
  (context: ProgramContext): ReadonlyArray<RuleListener> =>
    checks.flatMap(applyCheck(context))

export const withProgramIndex =
  <Index>(build: (context: ProgramContext) => Index) =>
  (
    listeners: (index: Index) => ReadonlyArray<RuleListener>
  ): RuleCheck =>
  (context: ProgramContext): ReadonlyArray<RuleListener> => {
    const index = build(context)

    return listeners(index)
  }
