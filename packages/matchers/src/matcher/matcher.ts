import * as path from "node:path"
import {
  Array,
  Data,
  Function,
  Iterable,
  MutableList,
  Option,
  Predicate,
  Struct,
  Tuple,
  flow,
  pipe
} from "effect"
import * as ts from "typescript"
import type { ProgramContext } from "../sources/data.js"
import { astNodesIn, isProjectSourceFile } from "../sources/sources.js"
import { sourceComments } from "../sources/comments.js"
import {
  DirectoryTarget,
  FileSubscription,
  Match,
  MatchContext,
  Matcher,
  NodeSubscription,
  WorkspaceContext,
  WorkspaceMatcher,
  WorkspaceSourceFile,
  type Subscription
} from "./data.js"

export type MatcherFilePredicate = (matcherIndex: number, sourceFile: ts.SourceFile) => boolean

// ActiveNodeSubscription binds one planned handler because fused dispatch mutates its buffer.
class ActiveNodeSubscription extends Data.Class<{
  readonly matcherIndex: number
  readonly handle: (node: ts.Node) => ReadonlyArray<Match<unknown>>
  readonly matches: MutableList.MutableList<Match<unknown>>
}> {}

const isNodeSubscription = (subscription: Subscription): subscription is NodeSubscription =>
  Predicate.hasProperty(subscription, "kinds")

const isFileSubscription = (subscription: Subscription): subscription is FileSubscription =>
  !isNodeSubscription(subscription)

const emptyCompilerOptions: ts.CompilerOptions = {}

export const makeMatcherFromSubscriptions = (
  plan: (context: ProgramContext) => ReadonlyArray<Subscription>
) => new Matcher({ plan, compilerOptions: emptyCompilerOptions })

// Program-indexed matching shares one index because each plan reads the same precomputed view.
export const withProgramMatcherIndex =
  <Index>(build: (context: ProgramContext) => Index) =>
  (subscriptions: (index: Index) => ReadonlyArray<Subscription>): Matcher =>
    makeMatcherFromSubscriptions(flow(build, subscriptions))

export const withCompilerOptions =
  (compilerOptions: ts.CompilerOptions) =>
  (matcher: Matcher): Matcher =>
    new Matcher({
      plan: matcher.plan,
      compilerOptions: { ...matcher.compilerOptions, ...compilerOptions }
    })

export const compilerOptionsForMatchers = (matchers: ReadonlyArray<Matcher>) =>
  Array.reduce(matchers, {} as ts.CompilerOptions, (options, matcher) =>
    Object.assign(options, matcher.compilerOptions)
  )

export const nodeSubscriptions =
  (kinds: ReadonlyArray<ts.SyntaxKind>) =>
  <N extends ts.Node>(refine: (node: ts.Node) => node is N) =>
  <Fact>(
    handler: (context: MatchContext) => (node: N) => ReadonlyArray<Match<Fact>>
  ): ReadonlyArray<Subscription> => {
    const wrapped = (context: MatchContext) => {
      const elements = handler(context)

      const refined = (node: ts.Node): ReadonlyArray<Match<unknown>> =>
        refine(node) ? elements(node) : Array.empty()

      return refined
    }

    const subscription = new NodeSubscription({ kinds, handler: wrapped })

    return Array.of(subscription)
  }

export const fileSubscriptions = <Fact>(
  handler: (context: MatchContext) => ReadonlyArray<Match<Fact>>
): ReadonlyArray<Subscription> =>
  pipe(
    new FileSubscription({
      handler: handler as (context: MatchContext) => ReadonlyArray<Match<unknown>>
    }),
    Array.of
  )

export const nodeMatcher =
  (kinds: ReadonlyArray<ts.SyntaxKind>) =>
  <N extends ts.Node>(refine: (node: ts.Node) => node is N) =>
  <Fact>(handler: (context: MatchContext) => (node: N) => ReadonlyArray<Match<Fact>>) =>
    pipe(nodeSubscriptions(kinds)(refine)(handler), Function.constant, makeMatcherFromSubscriptions)

export const fileMatcher = <Fact>(handler: (context: MatchContext) => ReadonlyArray<Match<Fact>>) =>
  pipe(fileSubscriptions(handler), Function.constant, makeMatcherFromSubscriptions)

const planNodeSubscription = (matcherIndex: number) => (subscription: NodeSubscription) =>
  Tuple.make(matcherIndex, subscription)

const planNodeSubscriptionsForMatcher = (
  subscriptions: ReadonlyArray<Subscription>,
  matcherIndex: number
) =>
  pipe(
    subscriptions,
    Array.filter(isNodeSubscription),
    Array.map(planNodeSubscription(matcherIndex))
  )

const appendKindToDispatch =
  (appendSubscription: (row: ReadonlyArray<number>) => ReadonlyArray<number>) =>
  (current: ReadonlyArray<ReadonlyArray<number>>, kind: ts.SyntaxKind) =>
    pipe(
      Array.modify(current, kind, appendSubscription),
      Option.getOrElse(Function.constant(current))
    )

const appendKindDispatchIndex = flow(Array.append<number>, appendKindToDispatch)

const registerPlannedKinds = (
  dispatch: ReadonlyArray<ReadonlyArray<number>>,
  planned: readonly [number, NodeSubscription],
  subscriptionIndex: number
) => {
  const subscription = Tuple.get(planned, 1)
  const appendIndex = appendKindDispatchIndex(subscriptionIndex)

  return Array.reduce(subscription.kinds, dispatch, appendIndex)
}

const emptyMatchBuffers = (matcherCount: number) =>
  matcherCount <= 0
    ? Array.empty<MutableList.MutableList<Match<unknown>>>()
    : Array.makeBy(matcherCount, () => MutableList.make<Match<unknown>>())

const activatePlannedSubscription =
  (includesSourceFile: MatcherFilePredicate) =>
  (sourceFile: ts.SourceFile) =>
  (matchContext: MatchContext) =>
  (planned: readonly [number, NodeSubscription]) => {
    const matcherIndex = Tuple.get(planned, 0)

    if (!includesSourceFile(matcherIndex, sourceFile)) {
      return Option.none()
    }

    const subscription = Tuple.get(planned, 1)
    const handle = subscription.handler(matchContext)
    const matches = MutableList.make<Match<unknown>>()
    const active = new ActiveNodeSubscription({ matcherIndex, handle, matches })

    return Option.some(active)
  }

const appendActiveNodeMatch =
  (activeNodeSubscriptions: ReadonlyArray<Option.Option<ActiveNodeSubscription>>) =>
  (subscriptionIndex: number) =>
  (node: ts.Node) => {
    const maybeActive = pipe(Array.get(activeNodeSubscriptions, subscriptionIndex), Option.flatten)

    if (Option.isNone(maybeActive)) {
      return Array.empty<Match<unknown>>()
    }

    const active = maybeActive.value
    const found = active.handle(node)

    MutableList.appendAll(active.matches, found)

    return found
  }

const drainActiveMatches =
  (matchesByMatcher: ReadonlyArray<MutableList.MutableList<Match<unknown>>>) =>
  (active: Option.Option<ActiveNodeSubscription>) => {
    if (Option.isNone(active)) {
      return Array.empty<Match<unknown>>()
    }

    const value = active.value
    const maybeMatches = Array.get(matchesByMatcher, value.matcherIndex)

    if (Option.isNone(maybeMatches)) {
      return Array.empty<Match<unknown>>()
    }

    const found = MutableList.toArray(value.matches)

    MutableList.appendAll(maybeMatches.value, found)

    return found
  }

// Fused dispatch is required because separate AST streams multiply traversal cost by matcher count.
export const runMatchers =
  (matchers: ReadonlyArray<Matcher>) =>
  (includesSourceFile: MatcherFilePredicate) =>
  (context: ProgramContext): ReadonlyArray<ReadonlyArray<Match<unknown>>> => {
    const programSourceFiles = context.program.getSourceFiles()
    const sourceFiles = Array.filter(programSourceFiles, isProjectSourceFile)

    const plans = Array.map(matchers, (matcher, matcherIndex) => {
      const sourceFileIsActive = (sourceFile: ts.SourceFile) =>
        includesSourceFile(matcherIndex, sourceFile)

      return Array.some(sourceFiles, sourceFileIsActive)
        ? matcher.plan(context)
        : Array.empty<Subscription>()
    })

    const plannedNodeSubscriptions = Array.flatMap(plans, planNodeSubscriptionsForMatcher)
    const emptyDispatch = Array.makeBy(ts.SyntaxKind.Count, () => Array.empty<number>())
    const emptySubscriptionIndexes = Array.empty<number>()
    const noSubscriptionIndexes = Function.constant(emptySubscriptionIndexes)
    const nodeDispatch = Array.reduce(plannedNodeSubscriptions, emptyDispatch, registerPlannedKinds)
    const matchesByMatcher = emptyMatchBuffers(matchers.length)
    const activatePlanned = activatePlannedSubscription(includesSourceFile)
    const runDrainActive = drainActiveMatches(matchesByMatcher)

    Array.forEach(sourceFiles, (sourceFile) => {
      const comments = sourceComments(sourceFile)

      const matchContext = MatchContext.make({
        program: context.program,
        checker: context.checker,
        projectRoot: context.projectRoot,
        workspaceRoot: context.workspaceRoot,
        sourceFile,
        comments
      })

      Array.forEach(plans, (subscriptions, matcherIndex) => {
        if (!includesSourceFile(matcherIndex, sourceFile)) {
          return
        }

        const filePlans = Array.filter(subscriptions, isFileSubscription)

        Array.forEach(filePlans, (subscription) => {
          const found = subscription.handler(matchContext)
          const maybeMatches = Array.get(matchesByMatcher, matcherIndex)

          if (Option.isSome(maybeMatches)) {
            MutableList.appendAll(maybeMatches.value, found)
          }
        })
      })

      const activateForFile = activatePlanned(sourceFile)(matchContext)
      const activeNodeSubscriptions = Array.map(plannedNodeSubscriptions, activateForFile)
      const appendNodeMatch = appendActiveNodeMatch(activeNodeSubscriptions)
      const nodes = astNodesIn(sourceFile)

      Iterable.forEach(nodes, (node) => {
        const subscriptions = pipe(
          Array.get(nodeDispatch, node.kind),
          Option.getOrElse(noSubscriptionIndexes)
        )

        const appendSubscriptionMatch = Function.flip(appendNodeMatch)(node)

        Array.forEach(subscriptions, appendSubscriptionMatch)
      })

      Array.forEach(activeNodeSubscriptions, runDrainActive)
    })

    return Array.map(matchesByMatcher, MutableList.toArray)
  }

export const makeWorkspaceMatcher = (
  match: (context: WorkspaceContext) => ReadonlyArray<Match<unknown>>
) => new WorkspaceMatcher({ match })

export const workspaceMatcher = makeWorkspaceMatcher

export const runWorkspaceMatchers =
  (matchers: ReadonlyArray<WorkspaceMatcher>) =>
  (context: WorkspaceContext): ReadonlyArray<ReadonlyArray<Match<unknown>>> =>
    Array.map(matchers, (matcher) => matcher.match(context))

const workspaceFilePath = (file: WorkspaceSourceFile) => Struct.get(file, "path")

const workspaceFileSource = (file: WorkspaceSourceFile) => Struct.get(file, "sourceFile")

const workspaceFileDirectory = flow(workspaceFilePath, path.posix.dirname)

const makeDirectoryTarget = (directory: string, files: ReadonlyArray<WorkspaceSourceFile>) => {
  const sourceFiles = Array.map(files, workspaceFileSource)

  return new DirectoryTarget({
    path: directory,
    sourceFiles
  })
}

const matchDirectoryFiles =
  (match: (target: DirectoryTarget) => ReadonlyArray<Match<unknown>>) =>
  (directory: string, files: ReadonlyArray<WorkspaceSourceFile>) =>
    pipe(makeDirectoryTarget(directory, files), match)

const directoryMatchesForContext =
  (match: (target: DirectoryTarget) => ReadonlyArray<Match<unknown>>) =>
  (context: WorkspaceContext) => {
    const filesByDirectory = Array.groupBy(context.sourceFiles, workspaceFileDirectory)
    const matchFiles = matchDirectoryFiles(match)

    return pipe(
      Object.entries(filesByDirectory),
      Array.flatMap(([directory, files]) => matchFiles(directory, files))
    )
  }

export const directoryMatcher = flow(directoryMatchesForContext, makeWorkspaceMatcher)
