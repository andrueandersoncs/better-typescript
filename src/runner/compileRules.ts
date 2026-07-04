import {
  Array,
  Function,
  HashMap,
  MutableList,
  Option,
  Schema,
  Struct,
  pipe
} from "effect"
import * as ts from "typescript"
import { FileListener, NodeListener } from "../rules/types.js"
import type {
  ProgramContext,
  Rule,
  RuleContext,
  RuleListener,
  Finding
} from "../rules/types.js"

type NodeHandler = NodeListener["handler"]
type FileHandler = FileListener["handler"]
type HandlerTable = HashMap.HashMap<ts.SyntaxKind, ReadonlyArray<NodeHandler>>
type AddKindHandler = (table: HandlerTable, kind: ts.SyntaxKind) => HandlerTable

type SpecializedNodeHandler = (node: ts.Node) => ReadonlyArray<Finding>
// SyntaxKind is a dense small-int enum, so a flat row-per-kind table beats a HashMap on the per-node hot path.
type DenseTable = ReadonlyArray<ReadonlyArray<NodeHandler>>
type SpecializedTable = ReadonlyArray<ReadonlyArray<SpecializedNodeHandler>>

type CheckSourceFile = (context: RuleContext) => ReadonlyArray<Finding>

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
    const dense: DenseTable = Array.makeBy(ts.SyntaxKind.Count, kindRow(table))
    const fileHandlers = listeners.filter(isFileListener).map(listenerHandler)

    return checkSourceFile(dense)(fileHandlers)
  }

const kindRow =
  (table: HandlerTable) =>
  (kind: number): ReadonlyArray<NodeHandler> =>
    pipe(
      HashMap.get(table, kind as ts.SyntaxKind),
      Option.getOrElse(emptyNodeHandlers)
    )

const emptySpecializedRow: ReadonlyArray<SpecializedNodeHandler> = []

// Context is applied to every handler once per file; the per-node loop reuses the specialized closures instead of re-running each rule's context stage per node.
const applyContext =
  (context: RuleContext) =>
  (handler: NodeHandler): SpecializedNodeHandler =>
    handler(context)

const specializeRow =
  (context: RuleContext) =>
  (row: ReadonlyArray<NodeHandler>): ReadonlyArray<SpecializedNodeHandler> =>
    row.length === 0 ? emptySpecializedRow : row.map(applyContext(context))

const applyFileHandler =
  (context: RuleContext) =>
  (handle: FileHandler): ReadonlyArray<Finding> =>
    handle(context)

const appendMatch =
  (collected: MutableList.MutableList<Finding>) =>
  (match: Finding): MutableList.MutableList<Finding> =>
    MutableList.append(collected, match)

const checkSourceFile =
  (dense: DenseTable) =>
  (fileHandlers: ReadonlyArray<FileHandler>) =>
  (context: RuleContext): ReadonlyArray<Finding> => {
    const fileMatches = fileHandlers.flatMap(applyFileHandler(context))
    const specialized: SpecializedTable = dense.map(specializeRow(context))
    // ts.forEachChild is callback-only, so match accumulation needs a mutable seam; MutableList keeps it bounded to this file's pass. The callback returns false so traversal never stops early.
    const collected = MutableList.empty<Finding>()
    const collect = appendMatch(collected)
    const visit = (node: ts.Node): false => {
      const row = specialized[node.kind]

      if (row.length > 0) {
        row.flatMap(applyToNode(node)).forEach(collect)
      }

      ts.forEachChild(node, visit)

      return false
    }
    visit(context.sourceFile)
    const nodeMatches = Array.fromIterable(collected)

    return fileMatches.concat(nodeMatches)
  }

// Function.apply would also work here, but its variadic rest/spread sits on the per-node hot path; a direct curried call keeps the loop monomorphic.
const applyToNode =
  (node: ts.Node) =>
  (handle: SpecializedNodeHandler): ReadonlyArray<Finding> =>
    handle(node)

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
