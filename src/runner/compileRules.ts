import { Array, Function, HashMap, Option, Schema, Struct, pipe } from "effect"
import * as ts from "typescript"
import { astChildren } from "../rules/traverse.js"
import { FileListener, NodeListener } from "../rules/types.js"
import type {
  ProgramContext,
  Rule,
  RuleContext,
  RuleListener,
  RuleMatch
} from "../rules/types.js"

type NodeHandler = NodeListener["handler"]
type FileHandler = FileListener["handler"]
type HandlerTable = HashMap.HashMap<ts.SyntaxKind, ReadonlyArray<NodeHandler>>
type AddKindHandler = (table: HandlerTable, kind: ts.SyntaxKind) => HandlerTable

type CheckSourceFile = (context: RuleContext) => ReadonlyArray<RuleMatch>

export const compileRules =
  (rules: ReadonlyArray<Rule>) =>
  (programContext: ProgramContext): CheckSourceFile => {
    const listeners = rules.flatMap(ruleListeners(programContext))
    const nodeListeners = listeners.filter(isNodeListener)
    const emptyTable = HashMap.empty<
      ts.SyntaxKind,
      ReadonlyArray<NodeHandler>
    >()
    const table = nodeListeners.reduce(addListenerHandlers, emptyTable)
    const fileHandlers = listeners.filter(isFileListener).map(listenerHandler)

    return checkSourceFile(table)(fileHandlers)
  }

const checkSourceFile =
  (table: HandlerTable) =>
  (fileHandlers: ReadonlyArray<FileHandler>) =>
  (context: RuleContext): ReadonlyArray<RuleMatch> => {
    const fileMatches = fileHandlers.flatMap(applyFileHandler(context))
    const visit = (node: ts.Node): ReadonlyArray<RuleMatch> => {
      const handlersForKind = pipe(
        HashMap.get(table, node.kind),
        Option.getOrElse(emptyNodeHandlers)
      )
      const ownMatches = handlersForKind.flatMap(
        applyNodeHandler(context)(node)
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
  (context: RuleContext) =>
  (node: ts.Node) =>
  (handle: NodeHandler): ReadonlyArray<RuleMatch> =>
    handle(context)(node)

const nodeListenerSchema = Schema.is(NodeListener)

const isNodeListener = (listener: RuleListener): listener is NodeListener =>
  nodeListenerSchema(listener)

const fileListenerSchema = Schema.is(FileListener)

const isFileListener = (listener: RuleListener): listener is FileListener =>
  fileListenerSchema(listener)

const ruleListeners =
  (programContext: ProgramContext) =>
  (rule: Rule): ReadonlyArray<RuleListener> =>
    rule.check(programContext)

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
  (handler: NodeHandler): AddKindHandler =>
  (table, kind) => {
    const kindHandlers = pipe(
      HashMap.get(table, kind),
      Option.getOrElse(emptyNodeHandlers)
    )
    const nextHandlers = Array.append(kindHandlers, handler)

    return HashMap.set(table, kind, nextHandlers)
  }
