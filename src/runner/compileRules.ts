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
type CheckSourceFile = (context: RuleContext) => ReadonlyArray<RuleMatch>

interface HandlerEntry {
  readonly kind: ts.SyntaxKind
  readonly handler: NodeHandler
}

// The interpreter for the RuleCheck algebra: folds every rule's listeners into a
// kind-dispatch table once, then checks each source file with a single AST walk.
// Per node, only the handlers subscribed to that node's kind run, so adding rules
// adds table entries instead of traversals.
export const compileRules = (rules: ReadonlyArray<Rule>): CheckSourceFile => {
  const listeners = rules.flatMap(ruleListeners)
  const table = nodeHandlerTable(listeners.filter(isNodeListener))
  const fileHandlers = listeners.filter(isFileListener).map(listenerHandler)

  return checkSourceFile(table, fileHandlers)
}

const ruleListeners = (rule: Rule): RuleCheck => rule.check

const listenerHandler = (listener: FileListener): FileHandler => listener.handler

const checkSourceFile =
  (table: NodeHandlerTable, fileHandlers: ReadonlyArray<FileHandler>) =>
  (context: RuleContext): ReadonlyArray<RuleMatch> =>
    fileHandlers
      .flatMap(applyFileHandler(context))
      .concat(compiledVisitor(table, context)(context.sourceFile))

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
  const visit = (node: ts.Node): ReadonlyArray<RuleMatch> =>
    (table.get(node.kind) ?? [])
      .flatMap(applyNodeHandler(node, context))
      .concat(astChildren(node).flatMap(visit))

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

const nodeHandlerTable = (listeners: ReadonlyArray<NodeListener>): NodeHandlerTable =>
  listeners
    .flatMap(listenerEntries)
    .reduce(addHandlerEntry, new Map<ts.SyntaxKind, ReadonlyArray<NodeHandler>>())

const listenerEntries = (listener: NodeListener): ReadonlyArray<HandlerEntry> =>
  listener.kinds.map(entryForHandler(listener.handler))

const entryForHandler =
  (handler: NodeHandler) =>
  (kind: ts.SyntaxKind): HandlerEntry => ({ kind, handler })

const addHandlerEntry = (
  table: Map<ts.SyntaxKind, ReadonlyArray<NodeHandler>>,
  entry: HandlerEntry
): Map<ts.SyntaxKind, ReadonlyArray<NodeHandler>> =>
  table.set(entry.kind, [...(table.get(entry.kind) ?? []), entry.handler])
