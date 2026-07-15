import {
  Tuple,
  Array,
  Effect,
  Function,
  HashMap,
  Iterable,
  List,
  MutableList,
  Option,
  Ref,
  Stream,
  pipe
} from "effect"
import * as ts from "typescript"
import type { ProjectConfig } from "../../project/loadProject/data.js"
import type { Detection } from "../location/data.js"
import { checkFromSubscriptions, isFileSubscription, isNodeSubscription } from "../check/check.js"
import {
  ActiveNodeSubscription,
  CachedPlan,
  Check,
  CheckContext,
  PlannedNodeSubscription,
  type Subscription
} from "../check/data.js"
import { AstNodeElement, ProgramContext, SourceUpdate } from "./data.js"

export type CheckFilePredicate = (checkIndex: number, sourceFile: ts.SourceFile) => boolean

export type AstFold<A> = (accumulator: A, node: ts.Node) => A

export const isProjectSourceFile = (sourceFile: ts.SourceFile): boolean => {
  const normalizedPath = sourceFile.fileName.replaceAll("\\", "/")
  const isInNodeModules = normalizedPath.includes("/node_modules/")
  const isSkippable = sourceFile.isDeclarationFile || isInNodeModules

  return !isSkippable
}

export const contextFor =
  (projectRoot: string) =>
  (program: ts.Program): ProgramContext => {
    const checker = program.getTypeChecker()

    return new ProgramContext({ program, checker, projectRoot })
  }

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

export const astChildren = (node: ts.Node): ReadonlyArray<ts.Node> => {
  const children = MutableList.empty<ts.Node>()

  ts.forEachChild(node, (child) => {
    MutableList.append(children, child)

    return false
  })

  return Array.fromIterable(children)
}

/**
 * Depth-first pre-order traversal backed by an explicit persistent stack.
 *
 * @remarks
 *   TypeScript trees can be arbitrarily deep, so traversal must not use the
 *   JavaScript call stack.
 */
export const astNodesIn = (root: ts.Node): Iterable<ts.Node> => {
  const initial = List.of(root)

  return Iterable.unfold<List.List<ts.Node>, ts.Node>(initial, (pending) => {
    if (List.isNil(pending)) {
      return Option.none()
    }

    const node = pending.head
    const children = astChildren(node)

    const next = Array.reduceRight(children, pending.tail, (stack, child) =>
      List.prepend(stack, child)
    )

    const entry = Tuple.make(node, next)

    return Option.some(entry)
  })
}

export const foldAst =
  <A>(fold: AstFold<A>) =>
  (root: ts.Node) =>
  (initial: A): A => {
    const nodes = astNodesIn(root)

    return Iterable.reduce(nodes, initial, fold)
  }

export const astNodesFromContext = (
  context: ProgramContext
): Stream.Stream<AstNodeElement, Error> =>
  pipe(
    context.program.getSourceFiles(),
    Array.filter(isProjectSourceFile),
    Stream.fromIterable,
    Stream.flatMap((sourceFile) =>
      pipe(
        astNodesIn(sourceFile),
        Stream.fromIterable,
        Stream.map((node) => new AstNodeElement({ context, sourceFile, node }))
      )
    )
  )

// Reporter diagnostics stay silent because the watcher must retain the last valid program through a transient config failure.
const ignoreDiagnostic = (_diagnostic: ts.Diagnostic): false => false

const stopWatch = (watch: ts.WatchOfConfigFile<ts.BuilderProgram>): Effect.Effect<void> =>
  Effect.sync(() => {
    watch.close()
  })

/**
 * The project-level root signal: one fresh ProgramContext per watch rebuild,
 * covering file edits, adds, deletes, and leaf tsconfig edits.
 *
 * @remarks
 *   Fresh contexts per rebuild are required because downstream diffs and checks
 *   must observe the program TypeScript just produced.
 */
export const programUpdates = (
  config: ProjectConfig,
  watchOptions: Option.Option<ts.WatchOptions>
): Stream.Stream<ProgramContext, Error> =>
  Stream.asyncPush<ProgramContext, Error>((emit) => {
    const acquire = Effect.sync(() => {
      const watchOptionsToExtend = Option.getOrUndefined(watchOptions)

      const host = ts.createWatchCompilerHost(
        config.configPath,
        undefined,
        ts.sys,
        ts.createAbstractBuilder,
        ignoreDiagnostic,
        ignoreDiagnostic,
        watchOptionsToExtend
      )

      // Assign the handler after construction because createWatchProgram emits the initial program synchronously and asyncPush buffers it.
      const afterProgramCreate = (builder: ts.BuilderProgram): boolean => {
        const program = builder.getProgram()
        const context = contextFor(config.rootPath)(program)

        return emit.single(context)
      }

      host.afterProgramCreate = afterProgramCreate

      return ts.createWatchProgram(host)
    })

    return Effect.acquireRelease(acquire, stopWatch)
  })

const emptyFileIndex: HashMap.HashMap<string, ts.SourceFile> = HashMap.empty()

const fileIndexEntry = (sourceFile: ts.SourceFile): readonly [string, ts.SourceFile] =>
  Tuple.make(sourceFile.fileName, sourceFile)

/**
 * Pure diff of one rebuilt program against the previous file index. Identity
 * diffing may over-report changed files (a redundant recompute at worst); it
 * never under-reports.
 *
 * @remarks
 *   Over-reporting is acceptable because missing a changed file would leave stale
 *   detections, while an extra recompute is only wasted work.
 */
export const diffCheckableFiles =
  (previous: HashMap.HashMap<string, ts.SourceFile>) =>
  (context: ProgramContext): readonly [HashMap.HashMap<string, ts.SourceFile>, SourceUpdate] => {
    const currentFiles = pipe(context.program.getSourceFiles(), Array.filter(isProjectSourceFile))
    const next = pipe(currentFiles, Array.map(fileIndexEntry), HashMap.fromIterable)

    const changed = Array.filter(currentFiles, (sourceFile) =>
      pipe(
        HashMap.get(previous, sourceFile.fileName),
        Option.match({
          onNone: Function.constant(true),
          onSome: (known) => known !== sourceFile
        })
      )
    )

    const removed = pipe(
      previous,
      HashMap.keys,
      Array.fromIterable,
      Array.filter((fileName) => !HashMap.has(next, fileName))
    )

    const update = new SourceUpdate({ context, changed, removed })

    return Tuple.make(next, update)
  }

/**
 * The file-level root signal: per rebuild, which checkable source files changed
 * and which paths disappeared (first emission: all checkable files).
 *
 * @remarks
 *   Changed and deleted paths are emitted together because workspace caching must
 *   drop removed files as well as refresh edited ones.
 */
export const sourceUpdates = (
  config: ProjectConfig,
  watchOptions: Option.Option<ts.WatchOptions>
): Stream.Stream<SourceUpdate, Error> =>
  pipe(
    programUpdates(config, watchOptions),
    Stream.mapAccum(emptyFileIndex, (previous, context) => diffCheckableFiles(previous)(context))
  )
