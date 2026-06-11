import * as ts from "typescript"
import { astChildren } from "../rules/traverse.js"
import type { FileListener, NodeListener, Rule, RuleContext, RuleListener, RuleMatch } from "../rules/types.js"

type NodeHandler = NodeListener["handler"]
type NodeHandlerTable = ReadonlyMap<ts.SyntaxKind, ReadonlyArray<NodeHandler>>

// The interpreter for the RuleCheck algebra: folds every rule's listeners into a
// kind-dispatch table once, then checks each source file with a single AST walk.
// Per node, only the handlers subscribed to that node's kind run, so adding rules
// adds table entries instead of traversals.
export const compileRules = (
  rules: ReadonlyArray<Rule>
): ((context: RuleContext) => ReadonlyArray<RuleMatch>) => {
  const listeners = rules.flatMap((rule) => rule.check)
  const table = nodeHandlerTable(listeners.filter(isNodeListener))
  const fileHandlers = listeners.filter(isFileListener).map((listener) => listener.handler)

  const visit = (node: ts.Node, context: RuleContext): ReadonlyArray<RuleMatch> =>
    (table.get(node.kind) ?? [])
      .flatMap((handle) => handle(node, context))
      .concat(astChildren(node).flatMap((child) => visit(child, context)))

  return (context) =>
    fileHandlers
      .flatMap((handle) => handle(context))
      .concat(visit(context.sourceFile, context))
}

const isNodeListener = (listener: RuleListener): listener is NodeListener =>
  listener._tag === "OnNode"

const isFileListener = (listener: RuleListener): listener is FileListener =>
  listener._tag === "OnFile"

const nodeHandlerTable = (listeners: ReadonlyArray<NodeListener>): NodeHandlerTable =>
  listeners
    .flatMap((listener) => listener.kinds.map((kind) => ({ kind, handler: listener.handler })))
    .reduce(
      (table, entry) => table.set(entry.kind, [...(table.get(entry.kind) ?? []), entry.handler]),
      new Map<ts.SyntaxKind, ReadonlyArray<NodeHandler>>()
    )
