import * as path from "node:path"
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
import type { ProgramContext } from "../sources/data.js"
import { astNodesIn, isProjectSourceFile } from "../sources/sources.js"
import { Detection, Location } from "../location/data.js"
import {
  ActiveNodeSubscription,
  CachedPlan,
  Check,
  CheckContext,
  FileSubscription,
  NodeSubscription,
  PlannedNodeSubscription,
  type DetectionSource,
  type FileHandler,
  type NodeHandler,
  type Subscription
} from "./data.js"

export type CheckFilePredicate = (checkIndex: number, sourceFile: ts.SourceFile) => boolean

export const nodeSubscription =
  (kinds: ReadonlyArray<ts.SyntaxKind>) =>
  (handler: NodeHandler): Subscription =>
    new NodeSubscription({ kind: "OnNode", kinds, handler })

const fileSubscription = (handler: FileHandler): Subscription =>
  new FileSubscription({ kind: "OnFile", handler })

export const isNodeSubscription = (subscription: Subscription): subscription is NodeSubscription =>
  subscription.kind === "OnNode"

export const isFileSubscription = (subscription: Subscription): subscription is FileSubscription =>
  subscription.kind === "OnFile"

const emptyCompilerOptions: ts.CompilerOptions = {}

export const checkFromSubscriptions = (
  plan: (context: ProgramContext) => ReadonlyArray<Subscription>
): Check => new Check({ plan, compilerOptions: emptyCompilerOptions })

export const withCompilerOptions =
  (compilerOptions: ts.CompilerOptions) =>
  (check: Check): Check =>
    new Check({
      plan: check.plan,
      compilerOptions: { ...check.compilerOptions, ...compilerOptions }
    })

export const compilerOptionsForChecks = (checks: ReadonlyArray<Check>): ts.CompilerOptions =>
  Array.reduce(checks, {} as ts.CompilerOptions, (options, check) =>
    Object.assign(options, check.compilerOptions)
  )

const locateNode =
  (context: CheckContext) =>
  (node: ts.Node): Location => {
    const sourceFile = context.sourceFile
    const start = node.getStart(sourceFile)
    const position = sourceFile.getLineAndCharacterOfPosition(start)
    const relative = path.relative(context.projectRoot, sourceFile.fileName)
    const fileName = relative || sourceFile.fileName

    return new Location({
      path: fileName,
      line: position.line + 1,
      column: position.character + 1
    })
  }

export const detection =
  (context: CheckContext) =>
  (source: DetectionSource): Detection => {
    const location = locateNode(context)(source.node)

    return new Detection({
      location,
      message: source.message,
      hint: source.hint,
      data: source.data
    })
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
  <N extends ts.Node>(refine: (node: ts.Node) => node is N) => {
    const subscribe = nodeSubscriptions(kinds)(refine)

    return flow(subscribe, Function.constant, checkFromSubscriptions)
  }

export const fileCheck = flow(fileSubscriptions, Function.constant, checkFromSubscriptions)

export const combineAll: (subscriptionGroups: ReadonlyArray<ReadonlyArray<Subscription>>) => Check =
  flow(Array.flatten, Function.constant, checkFromSubscriptions)

// Fused dispatch is required because separate AST streams multiply traversal cost by check count.
export const runChecks =
  (checks: ReadonlyArray<Check>) =>
  (includesSourceFile: CheckFilePredicate) =>
  (context: ProgramContext): ReadonlyArray<ReadonlyArray<Detection>> => {
    const allSourceFiles = context.program.getSourceFiles()
    const sourceFiles = Array.filter(allSourceFiles, isProjectSourceFile)

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
          pipe(current, Array.modify(kind, Array.append(subscriptionIndex)), Option.getOrThrow)
        )
    )

    const detectionsByCheck =
      checks.length <= 0
        ? Array.empty<MutableList.MutableList<Detection>>()
        : Array.makeBy(checks.length, () => MutableList.make<Detection>())

    Array.forEach(sourceFiles, (sourceFile) => {
      const checkContext = new CheckContext({
        program: context.program,
        checker: context.checker,
        projectRoot: context.projectRoot,
        workspaceRoot: context.workspaceRoot,
        sourceFile
      })

      Array.forEach(plans, (subscriptions, checkIndex) => {
        if (includesSourceFile(checkIndex, sourceFile)) {
          pipe(
            subscriptions,
            Array.filter(isFileSubscription),
            Array.forEach((subscription) => {
              const found = subscription.handler(checkContext)

              MutableList.appendAll(detectionsByCheck[checkIndex], found)
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
          const detections = MutableList.make<Detection>()

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

            MutableList.appendAll(active.value.detections, found)
          }
        })
      })

      Array.forEach(activeNodeSubscriptions, (active) => {
        if (Option.isSome(active)) {
          const detections = MutableList.toArray(active.value.detections)

          MutableList.appendAll(detectionsByCheck[active.value.checkIndex], detections)
        }
      })
    })

    return Array.map(detectionsByCheck, MutableList.toArray)
  }

export const withProgramIndex =
  <Index>(build: (context: ProgramContext) => Index) =>
  (subscriptions: (index: Index) => ReadonlyArray<Subscription>): Check => {
    const emptyPlanCache = Option.none<CachedPlan>()
    const planCache = Ref.makeUnsafe(emptyPlanCache)

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
