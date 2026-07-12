import {
  Tuple,
  Array,
  Chunk,
  Function,
  HashSet,
  Option,
  Stream,
  Struct,
  flow,
  pipe
} from "effect"
import type * as ts from "typescript"
import type { Detection } from "../location/data.js"
import { ProgramContext } from "../sources/data.js"
import type { AstNodeElement } from "../sources/data.js"
import {
  CheckContext,
  FileHandler,
  FileSubscription,
  NodeHandler,
  NodeSubscription,
  type Subscription
} from "./data.js"

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

        const nested0 = plan(head.context)

        const planned = pipe(
          state,
          Option.filter(([previous]) => previous === head.context),
          Option.getOrElse(() => Tuple.make(head.context, nested0))
        )

        const [, subscriptions] = planned

        const fileContext = new CheckContext({
          program: head.context.program,
          checker: head.context.checker,
          projectRoot: head.context.projectRoot,
          sourceFile
        })

        const fileNodes = Chunk.toReadonlyArray(elements)

        const fileElements = pipe(
          subscriptions,
          Array.filter(isFileSubscription),
          Array.flatMap((subscription) => subscription.handler(fileContext))
        )

        const nodeElements = pipe(
          subscriptions,
          Array.filter(isNodeSubscription),
          Array.flatMap((subscription) => {
            const kinds = HashSet.fromIterable(subscription.kinds)
            const handle = subscription.handler(fileContext)

            const accepted = Array.filter(fileNodes, (element) =>
              HashSet.has(kinds, element.node.kind)
            )

            return Array.flatMap(accepted, (element) => handle(element.node))
          })
        )

        const detections = Array.appendAll(fileElements, nodeElements)

        const nested1 = Option.some(planned)
        return Tuple.make(nested1, detections)
      }),
      Stream.flattenIterables
    )

export const nodeSubscriptions =
  (kinds: ReadonlyArray<ts.SyntaxKind>) =>
  <N extends ts.Node>(refine: (node: ts.Node) => node is N) =>
  (
    handler: (context: CheckContext) => (node: N) => ReadonlyArray<Detection>
  ): ReadonlyArray<Subscription> => {
    const wrapped: NodeHandler = (context) => {
      const elements = handler(context)

      const refined = (node: ts.Node): ReadonlyArray<Detection> =>
        refine(node) ? elements(node) : Array.empty()

      return refined
    }

    const subscribe = nodeSubscription(kinds)

    return pipe(wrapped, subscribe, Array.of)
  }

export const fileSubscriptions = (
  handler: (context: CheckContext) => ReadonlyArray<Detection>
): ReadonlyArray<Subscription> => pipe(handler, fileSubscription, Array.of)

export const nodeCheck =
  (kinds: ReadonlyArray<ts.SyntaxKind>) =>
  <N extends ts.Node>(refine: (node: ts.Node) => node is N) =>
    flow(
      nodeSubscriptions(kinds)(refine),
      Function.constant,
      checkFromSubscriptions
    )

export const fileCheck = flow(
  fileSubscriptions,
  Function.constant,
  checkFromSubscriptions
)

export const combineAll: (
  subscriptionGroups: ReadonlyArray<ReadonlyArray<Subscription>>
) => Check = flow(Array.flatten, Function.constant, checkFromSubscriptions)

export const withProgramIndex =
  <Index>(build: (context: ProgramContext) => Index) =>
  (subscriptions: (index: Index) => ReadonlyArray<Subscription>): Check =>
    checkFromSubscriptions(flow(build, subscriptions))
