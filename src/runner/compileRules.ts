import * as ts from "typescript"
import { astChildren } from "../rules/traverse.js"
import type {
  FileListener,
  NodeListener,
  Rule,
  RuleCheck,
  RuleContext,
  RuleListener,
  RuleMatch
} from "../rules/types.js"

type NodeHandler = NodeListener["handler"]
type FileHandler = FileListener["handler"]
type NodeHandlerTable = ReadonlyMap<ts.SyntaxKind, ReadonlyArray<NodeHandler>>
type MutableHandlerTable = Map<ts.SyntaxKind, ReadonlyArray<NodeHandler>>
type CheckSourceFile = (context: RuleContext) => ReadonlyArray<RuleMatch>

// The interpreter for the RuleCheck algebra: folds every rule's listeners into a
// kind-dispatch table once, then checks each source file with a single AST walk.
// Per node, only the handlers subscribed to that node's kind run, so adding rules
// adds table entries instead of traversals.
export const compileRules = (rules: ReadonlyArray<Rule>): CheckSourceFile => {
  const listeners = rules.flatMap(ruleListeners)
  const nodeListeners = listeners.filter(isNodeListener)
  const table = nodeHandlerTable(nodeListeners)
  const fileHandlers = listeners.filter(isFileListener).map(listenerHandler)

  return checkSourceFile(table, fileHandlers)
}

const ruleListeners = (rule: Rule): RuleCheck => rule.check

const listenerHandler = (listener: FileListener): FileHandler => listener.handler

const checkSourceFile =
  (table: NodeHandlerTable, fileHandlers: ReadonlyArray<FileHandler>) =>
  (context: RuleContext): ReadonlyArray<RuleMatch> => {
    const fileMatches = fileHandlers.flatMap(applyFileHandler(context))
    const nodeMatches = compiledVisitor(table, context)(context.sourceFile)

    return fileMatches.concat(nodeMatches)
  }

const applyFileHandler =
  (context: RuleContext) =>
  (handle: FileHandler): ReadonlyArray<RuleMatch> =>
    handle(context)

// The recursive visitor is bound once per source file so recursion reuses a single
// closure instead of re-currying at every node.
const compiledVisitor = (
  table: NodeHandlerTable,
  context: RuleContext
): ((node: ts.Node) => ReadonlyArray<RuleMatch>) => {
  const visit = (node: ts.Node): ReadonlyArray<RuleMatch> => {
    const ownMatches = (table.get(node.kind) ?? []).flatMap(applyNodeHandler(node, context))
    const childMatches = astChildren(node).flatMap(visit)

    return ownMatches.concat(childMatches)
  }

  return visit
}

const applyNodeHandler =
  (node: ts.Node, context: RuleContext) =>
  (handle: NodeHandler): ReadonlyArray<RuleMatch> =>
    handle(node, context)

const isNodeListener = (listener: RuleListener): listener is NodeListener =>
  listener._tag === "OnNode"

const isFileListener = (listener: RuleListener): listener is FileListener =>
  listener._tag === "OnFile"

const nodeHandlerTable = (listeners: ReadonlyArray<NodeListener>): NodeHandlerTable => {
  const emptyTable = new Map<ts.SyntaxKind, ReadonlyArray<NodeHandler>>()

  return listeners.reduce(addListenerHandlers, emptyTable)
}

const addListenerHandlers = (
  table: MutableHandlerTable,
  listener: NodeListener
): MutableHandlerTable => listener.kinds.reduce(addKindHandler(listener.handler), table)

const addKindHandler =
  (handler: NodeHandler) =>
  (table: MutableHandlerTable, kind: ts.SyntaxKind): MutableHandlerTable => {
    const kindHandlers = table.get(kind) ?? []

    return table.set(kind, [...kindHandlers, handler])
  }
