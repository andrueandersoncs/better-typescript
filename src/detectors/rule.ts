import {
  Array,
  Chunk,
  HashSet,
  Option,
  Schema,
  Stream,
  Struct,
  pipe
} from "effect"
import type * as ts from "typescript"
import { Detection } from "./location.js"
import { ProgramContext } from "./sources.js"
import type { AstNodeElement } from "./sources.js"
import { TsProgram, TsSourceFile, TsTypeChecker } from "./tsSchema.js"

export { Detection, ProgramContext }

export class RuleContext extends Schema.Class<RuleContext>("RuleContext")({
  program: TsProgram,
  checker: TsTypeChecker,
  projectRoot: Schema.String,
  sourceFile: TsSourceFile
}) {}

export type NodeHandler = (
  context: RuleContext
) => (node: ts.Node) => ReadonlyArray<Detection>

export type FileHandler = (context: RuleContext) => ReadonlyArray<Detection>

const onNodeKind = Schema.Literal("OnNode")
const syntaxKinds = Schema.Array(Schema.Number)
const onFileKind = Schema.Literal("OnFile")

export class NodeSubscription extends Schema.Class<NodeSubscription>(
  "NodeSubscription"
)({
  kind: onNodeKind,
  kinds: syntaxKinds,
  handler: Schema.Any
}) {
  declare readonly kinds: ReadonlyArray<ts.SyntaxKind>
  declare readonly handler: NodeHandler
}

export class FileSubscription extends Schema.Class<FileSubscription>(
  "FileSubscription"
)({
  kind: onFileKind,
  handler: Schema.Any
}) {
  declare readonly handler: FileHandler
}

export type Subscription = NodeSubscription | FileSubscription

// A rule is a detector: it transforms the upstream AST-node stream into its signal.
export type RuleCheck = (
  nodes: Stream.Stream<AstNodeElement, Error>
) => Stream.Stream<Detection, Error>

export const nodeSubscription =
  (kinds: ReadonlyArray<ts.SyntaxKind>) =>
  (handler: NodeHandler): NodeSubscription =>
    new NodeSubscription({ kind: "OnNode", kinds, handler })

export const fileSubscription = (handler: FileHandler): FileSubscription =>
  new FileSubscription({ kind: "OnFile", handler })

export const isNodeSubscription = (
  subscription: Subscription
): subscription is NodeSubscription => subscription.kind === "OnNode"

export const isFileSubscription = (
  subscription: Subscription
): subscription is FileSubscription => subscription.kind === "OnFile"

const ruleContextFor =
  (context: ProgramContext) =>
  (sourceFile: ts.SourceFile): RuleContext =>
    new RuleContext({
      program: context.program,
      checker: context.checker,
      projectRoot: context.projectRoot,
      sourceFile
    })

const acceptsNodeKind =
  (kinds: HashSet.HashSet<ts.SyntaxKind>) =>
  (element: AstNodeElement): boolean =>
    HashSet.has(kinds, element.node.kind)

const handleNodeElement =
  (handle: (node: ts.Node) => ReadonlyArray<Detection>) =>
  (element: AstNodeElement): ReadonlyArray<Detection> =>
    handle(element.node)

const runNodeSubscriptionForFile =
  (context: RuleContext) =>
  (fileNodes: ReadonlyArray<AstNodeElement>) =>
  (subscription: NodeSubscription): ReadonlyArray<Detection> => {
    const kinds = HashSet.fromIterable(subscription.kinds)
    const handle = subscription.handler(context)
    const accepted = fileNodes.filter(acceptsNodeKind(kinds))

    return accepted.flatMap(handleNodeElement(handle))
  }

const runFileSubscription =
  (context: RuleContext) =>
  (subscription: FileSubscription): ReadonlyArray<Detection> =>
    subscription.handler(context)

const runSubscriptionsForFile =
  (context: RuleContext) =>
  (fileNodes: ReadonlyArray<AstNodeElement>) =>
  (subscriptions: ReadonlyArray<Subscription>): ReadonlyArray<Detection> => {
    const fileElements = subscriptions
      .filter(isFileSubscription)
      .flatMap(runFileSubscription(context))
    const nodeElements = subscriptions
      .filter(isNodeSubscription)
      .flatMap(runNodeSubscriptionForFile(context)(fileNodes))

    return Array.appendAll(fileElements, nodeElements)
  }

type PlannedSubscriptions = readonly [
  ProgramContext,
  ReadonlyArray<Subscription>
]

const noPlan: Option.Option<PlannedSubscriptions> = Option.none()

// The plan runs once per program context, derived from the elements themselves; adjacent grouping yields one context stage per file, since every checkable file emits at least its root SourceFile node.
export const checkFromSubscriptions =
  (plan: (context: ProgramContext) => ReadonlyArray<Subscription>): RuleCheck =>
  (nodes) =>
    pipe(
      nodes,
      Stream.groupAdjacentBy(Struct.get("sourceFile")),
      Stream.mapAccum(noPlan, (state, [sourceFile, elements]) => {
        const head = Chunk.headNonEmpty(elements)
        const planned = pipe(
          state,
          Option.filter(([previous]) => previous === head.context),
          Option.getOrElse(() => [head.context, plan(head.context)] as const)
        )
        const [, subscriptions] = planned
        const fileContext = ruleContextFor(head.context)(sourceFile)
        const fileNodes = Chunk.toReadonlyArray(elements)
        const detections =
          runSubscriptionsForFile(fileContext)(fileNodes)(subscriptions)

        return [Option.some(planned), detections] as const
      }),
      Stream.flattenIterables
    )
