import { Array, Function, HashMap, Option, Schema, Struct, pipe } from "effect"
import * as ts from "typescript"
import { astChildren } from "../rules/traverse.js"
import { FileListener, NodeListener } from "../rules/types.js"
import type {
  Rule,
  RuleCheck,
  RuleContext,
  RuleListener,
  RuleMatch
} from "../rules/types.js"

type NodeHandler = NodeListener["handler"]
type FileHandler = FileListener["handler"]
type HandlerTable = HashMap.HashMap<ts.SyntaxKind, ReadonlyArray<NodeHandler>>
type CheckSourceFile = (context: RuleContext) => ReadonlyArray<RuleMatch>

export const compileRules = (rules: ReadonlyArray<Rule>): CheckSourceFile => {
  const listeners = rules.flatMap(ruleListeners)
  const nodeListeners = listeners.filter(isNodeListener)
  const emptyTable = HashMap.empty<ts.SyntaxKind, ReadonlyArray<NodeHandler>>()
  const table = nodeListeners.reduce(addListenerHandlers, emptyTable)
  const fileHandlers = listeners.filter(isFileListener).map(listenerHandler)

  return checkSourceFile(table, fileHandlers)
}

const checkSourceFile =
  (table: HandlerTable, fileHandlers: ReadonlyArray<FileHandler>) =>
  (context: RuleContext): ReadonlyArray<RuleMatch> => {
    const fileMatches = fileHandlers.flatMap(applyFileHandler(context))
    const visit = (node: ts.Node): ReadonlyArray<RuleMatch> => {
      const handlersForKind = pipe(
        HashMap.get(table, node.kind),
        Option.getOrElse(emptyNodeHandlers)
      )
      const ownMatches = handlersForKind.flatMap(
        applyNodeHandler(node, context)
      )
      const childMatches = astChildren(node).flatMap(visit)

      return ownMatches.concat(childMatches)
    }
    const nodeMatches = visit(context.sourceFile)

    return fileMatches.concat(nodeMatches)
  }

const applyFileHandler =
  (context: RuleContext) =>
  (handle: FileHandler): ReadonlyArray<RuleMatch> =>
    handle(context)

const applyNodeHandler =
  (node: ts.Node, context: RuleContext) =>
  (handle: NodeHandler): ReadonlyArray<RuleMatch> =>
    handle(node, context)

const nodeListenerSchema = Schema.is(NodeListener)

const isNodeListener = (listener: RuleListener): listener is NodeListener =>
  nodeListenerSchema(listener)

const fileListenerSchema = Schema.is(FileListener)

const isFileListener = (listener: RuleListener): listener is FileListener =>
  fileListenerSchema(listener)

const ruleListeners: (rule: Rule) => RuleCheck = Struct.get("check")

const listenerHandler: (listener: FileListener) => FileHandler =
  Struct.get("handler")

const addListenerHandlers = (
  table: HandlerTable,
  listener: NodeListener
): HandlerTable =>
  listener.kinds.reduce(addKindHandler(listener.handler), table)

const emptyNodeHandlers: Function.LazyArg<ReadonlyArray<NodeHandler>> =
  Function.constant([])

const addKindHandler =
  (handler: NodeHandler) =>
  (table: HandlerTable, kind: ts.SyntaxKind): HandlerTable => {
    const kindHandlers = pipe(
      HashMap.get(table, kind),
      Option.getOrElse(emptyNodeHandlers)
    )
    const nextHandlers = Array.append(kindHandlers, handler)

    return HashMap.set(table, kind, nextHandlers)
  }
