import {
  Array,
  Effect,
  Function,
  Iterable,
  MutableList,
  Option,
  Ref,
  Tuple,
  flow,
  pipe
} from "effect"
import * as ts from "typescript"
import type { Detection } from "../location/data.js"
import type { ProgramContext } from "../sources/data.js"
import { astNodesIn, isProjectSourceFile } from "../sources/sources.js"
import {
  ActiveNodeSubscription,
  CachedPlan,
  Check,
  CheckContext,
  FileHandler,
  FileSubscription,
  NodeHandler,
  NodeSubscription,
  PlannedNodeSubscription,
  type Subscription
} from "./data.js"

export type CheckFilePredicate = (checkIndex: number, sourceFile: ts.SourceFile) => boolean

export const nodeSubscription =
  (kinds: ReadonlyArray<ts.SyntaxKind>) =>
  (handler: NodeHandler): Subscription =>
    new NodeSubscription({ kind: "OnNode", kinds, handler })

export const fileSubscription = (handler: FileHandler): Subscription =>
  new FileSubscription({ kind: "OnFile", handler })

const isNodeSubscription = (subscription: Subscription): subscription is NodeSubscription =>
  subscription.kind === "OnNode"

const isFileSubscription = (subscription: Subscription): subscription is FileSubscription =>
  subscription.kind === "OnFile"

export const checkFromSubscriptions = (
  plan: (context: ProgramContext) => ReadonlyArray<Subscription>
): Check => new Check({ plan })

/**
 * Compile all active subscriptions for one program and dispatch every AST node
 * once by SyntaxKind. Result arrays stay aligned with the input check order.
 *
 * @remarks
 *   Fused dispatch is required because independent AST streams multiply traversal
 *   and allocation costs by the number of checks.
 */
export const runChecks =
  (checks: ReadonlyArray<Check>) =>
  (includesSourceFile: CheckFilePredicate) =>
  (context: ProgramContext): ReadonlyArray<ReadonlyArray<Detection>> => {
    const sourceFiles = pipe(context.program.getSourceFiles(), Array.filter(isProjectSourceFile))

    const plans = Array.map(checks, (check, checkIndex) => {
      const isActive = Array.some(sourceFiles, (sourceFile) =>
        includesSourceFile(checkIndex, sourceFile)
      )

      return isActive ? check.plan(context) : Array.empty<Subscription>()
    })

    const plannedNodeSubscriptions = Array.flatMap(plans, (subscriptions, checkIndex) =>
      pipe(
        subscriptions,
        Array.filter(isNodeSubscription),
        Array.map((subscription) => new PlannedNodeSubscription({ checkIndex, subscription }))
      )
    )

    const emptyDispatch = Array.makeBy(ts.SyntaxKind.Count, () => Array.empty<number>())

    const nodeDispatch = Array.reduce(
      plannedNodeSubscriptions,
      emptyDispatch,
      (dispatch, planned, subscriptionIndex) =>
        Array.reduce(planned.subscription.kinds, dispatch, (current, kind) =>
          Array.modify(current, kind, Array.append(subscriptionIndex))
        )
    )

    const detectionsByCheck = Array.makeBy(checks.length, () => MutableList.empty<Detection>())

    Array.forEach(sourceFiles, (sourceFile) => {
      const checkContext = new CheckContext({
        program: context.program,
        checker: context.checker,
        projectRoot: context.projectRoot,
        sourceFile
      })

      Array.forEach(plans, (subscriptions, checkIndex) => {
        if (includesSourceFile(checkIndex, sourceFile)) {
          pipe(
            subscriptions,
            Array.filter(isFileSubscription),
            Array.forEach((subscription) => {
              const found = subscription.handler(checkContext)

              Array.reduce(found, detectionsByCheck[checkIndex], MutableList.append)
            })
          )
        }
      })

      const activeNodeSubscriptions = Array.map(
        plannedNodeSubscriptions,
        (planned): Option.Option<ActiveNodeSubscription> => {
          if (!includesSourceFile(planned.checkIndex, sourceFile)) {
            return Option.none()
          }

          const handle = planned.subscription.handler(checkContext)
          const detections = MutableList.empty<Detection>()

          const active = new ActiveNodeSubscription({
            checkIndex: planned.checkIndex,
            handle,
            detections
          })

          return Option.some(active)
        }
      )

      const nodes = astNodesIn(sourceFile)

      Iterable.forEach(nodes, (node) => {
        Array.forEach(nodeDispatch[node.kind], (subscriptionIndex) => {
          const active = activeNodeSubscriptions[subscriptionIndex]

          if (Option.isSome(active)) {
            const found = active.value.handle(node)

            Array.reduce(found, active.value.detections, MutableList.append)
          }
        })
      })

      Array.forEach(activeNodeSubscriptions, (active) => {
        if (Option.isSome(active)) {
          Iterable.reduce(
            active.value.detections,
            detectionsByCheck[active.value.checkIndex],
            MutableList.append
          )
        }
      })
    })

    return Array.map(detectionsByCheck, Array.fromIterable)
  }

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
    flow(nodeSubscriptions(kinds)(refine), Function.constant, checkFromSubscriptions)

export const fileCheck = flow(fileSubscriptions, Function.constant, checkFromSubscriptions)

export const combineAll: (subscriptionGroups: ReadonlyArray<ReadonlyArray<Subscription>>) => Check =
  flow(Array.flatten, Function.constant, checkFromSubscriptions)

export const withProgramIndex =
  <Index>(build: (context: ProgramContext) => Index) =>
  (subscriptions: (index: Index) => ReadonlyArray<Subscription>): Check => {
    const emptyPlanCache = Option.none<CachedPlan>()
    const planCache = Ref.unsafeMake(emptyPlanCache)

    const plan: (context: ProgramContext) => ReadonlyArray<Subscription> = (context) => {
      const readOrBuild = (
        cached: Option.Option<CachedPlan>
      ): readonly [ReadonlyArray<Subscription>, Option.Option<CachedPlan>] => {
        const current = pipe(
          cached,
          Option.filter((entry) => entry.program === context.program)
        )

        if (Option.isSome(current)) {
          const planned = current.value.subscriptions

          return Tuple.make(planned, cached)
        }

        const index = build(context)
        const planned = subscriptions(index)

        const entry = new CachedPlan({
          program: context.program,
          subscriptions: planned
        })

        const updated = Option.some(entry)

        return Tuple.make(planned, updated)
      }

      const cachedPlan = Ref.modify(planCache, readOrBuild)

      return Effect.runSync(cachedPlan)
    }

    return checkFromSubscriptions(plan)
  }
