import {
  Array,
  Chunk,
  Function,
  HashSet,
  Option,
  Schema,
  Stream,
  Struct,
  pipe
} from "effect"
import type * as ts from "typescript"
import { Detection, detection } from "./location.js"
import { ProgramContext } from "./sources.js"
import type { AstNodeElement } from "./sources.js"
import { TsProgram, TsSourceFile, TsTypeChecker } from "./tsSchema.js"

export { Detection, detection, ProgramContext }

export class CheckContext extends Schema.Class<CheckContext>("CheckContext")({
  program: TsProgram,
  checker: TsTypeChecker,
  projectRoot: Schema.String,
  sourceFile: TsSourceFile
}) {}

export type NodeHandler = (
  context: CheckContext
) => (node: ts.Node) => ReadonlyArray<Detection>

export type FileHandler = (context: CheckContext) => ReadonlyArray<Detection>

const onNodeKind = Schema.Literal("OnNode")
const syntaxKinds = Schema.Array(Schema.Number)
const onFileKind = Schema.Literal("OnFile")

class NodeSubscription extends Schema.Class<NodeSubscription>(
  "NodeSubscription"
)({
  kind: onNodeKind,
  kinds: syntaxKinds,
  handler: Schema.Any
}) {
  declare readonly kinds: ReadonlyArray<ts.SyntaxKind>
  declare readonly handler: NodeHandler
}

class FileSubscription extends Schema.Class<FileSubscription>(
  "FileSubscription"
)({
  kind: onFileKind,
  handler: Schema.Any
}) {
  declare readonly handler: FileHandler
}

export type Subscription = NodeSubscription | FileSubscription

export type Check = (
  nodes: Stream.Stream<AstNodeElement, Error>
) => Stream.Stream<Detection, Error>

export const nodeSubscription =
  (kinds: ReadonlyArray<ts.SyntaxKind>) =>
  (handler: NodeHandler): Subscription =>
    new NodeSubscription({ kind: "OnNode", kinds, handler })

export const fileSubscription = (handler: FileHandler): Subscription =>
  new FileSubscription({ kind: "OnFile", handler })

const isNodeSubscription = (
  subscription: Subscription
): subscription is NodeSubscription => subscription.kind === "OnNode"

const isFileSubscription = (
  subscription: Subscription
): subscription is FileSubscription => subscription.kind === "OnFile"

const checkContextFor =
  (context: ProgramContext) =>
  (sourceFile: ts.SourceFile): CheckContext =>
    new CheckContext({
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
  (context: CheckContext) =>
  (fileNodes: ReadonlyArray<AstNodeElement>) =>
  (subscription: NodeSubscription): ReadonlyArray<Detection> => {
    const kinds = HashSet.fromIterable(subscription.kinds)
    const handle = subscription.handler(context)
    const accepted = fileNodes.filter(acceptsNodeKind(kinds))

    return accepted.flatMap(handleNodeElement(handle))
  }

const runFileSubscription =
  (context: CheckContext) =>
  (subscription: FileSubscription): ReadonlyArray<Detection> =>
    subscription.handler(context)

const runSubscriptionsForFile =
  (context: CheckContext) =>
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

export const checkFromSubscriptions =
  (plan: (context: ProgramContext) => ReadonlyArray<Subscription>): Check =>
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
        const fileContext = checkContextFor(head.context)(sourceFile)
        const fileNodes = Chunk.toReadonlyArray(elements)
        const detections =
          runSubscriptionsForFile(fileContext)(fileNodes)(subscriptions)

        return [Option.some(planned), detections] as const
      }),
      Stream.flattenIterables
    )

const refinedHandler =
  <N extends ts.Node>(refine: (node: ts.Node) => node is N) =>
  (
    handler: (context: CheckContext) => (node: N) => ReadonlyArray<Detection>
  ): NodeHandler =>
  (context) => {
    const elements = handler(context)
    const refined = (node: ts.Node): ReadonlyArray<Detection> =>
      refine(node) ? elements(node) : []

    return refined
  }

export const nodeSubscriptions =
  (kinds: ReadonlyArray<ts.SyntaxKind>) =>
  <N extends ts.Node>(refine: (node: ts.Node) => node is N) =>
  (
    handler: (context: CheckContext) => (node: N) => ReadonlyArray<Detection>
  ): ReadonlyArray<Subscription> => [
    nodeSubscription(kinds)(refinedHandler(refine)(handler))
  ]

export const fileSubscriptions = (
  handler: (context: CheckContext) => ReadonlyArray<Detection>
): ReadonlyArray<Subscription> => [fileSubscription(handler)]

export const nodeCheck =
  (kinds: ReadonlyArray<ts.SyntaxKind>) =>
  <N extends ts.Node>(refine: (node: ts.Node) => node is N) =>
  (
    handler: (context: CheckContext) => (node: N) => ReadonlyArray<Detection>
  ): Check => {
    const subscriptions = nodeSubscriptions(kinds)(refine)(handler)

    return checkFromSubscriptions(Function.constant(subscriptions))
  }

export const fileCheck = (
  handler: (context: CheckContext) => ReadonlyArray<Detection>
): Check => {
  const subscriptions = fileSubscriptions(handler)

  return checkFromSubscriptions(Function.constant(subscriptions))
}

export const combineAll = (
  subscriptionGroups: ReadonlyArray<ReadonlyArray<Subscription>>
): Check => {
  const subscriptions = Array.flatten(subscriptionGroups)

  return checkFromSubscriptions(Function.constant(subscriptions))
}

export const withProgramIndex =
  <Index>(build: (context: ProgramContext) => Index) =>
  (subscriptions: (index: Index) => ReadonlyArray<Subscription>): Check => {
    const plan = (context: ProgramContext): ReadonlyArray<Subscription> => {
      const index = build(context)

      return subscriptions(index)
    }

    return checkFromSubscriptions(plan)
  }
