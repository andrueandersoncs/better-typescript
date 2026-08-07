import * as ts from "typescript"
import { strictEqual } from "../equivalence.js"
import { astNodesIn } from "../sources/astNodesIn.js"
import { braceContext } from "../sources/braceContext.js"
import { SourceComment } from "../sources/commentsData.js"
import type { ProgramContext } from "../sources/data.js"
import { isProjectSourceFile } from "../sources/isProjectSourceFile.js"
import type { ScanContext } from "../sources/scanContext.js"
import { templateContext } from "../sources/templateContext.js"
import { ActiveNodeSubscription } from "./activeNodeSubscription.js"
import { FileSubscription } from "./fileSubscription.js"
import { isNodeSubscription } from "./isNodeSubscription.js"
import { Match } from "./match.js"
import { MatchContext } from "./matchContext.js"
import { Matcher } from "./matcherData.js"
import type { MatcherFilePredicate } from "./matcherFilePredicate.js"
import { NodeSubscription } from "./nodeSubscription.js"
import { ProgramMatchContext } from "./programMatchContext.js"
import type { Subscription } from "./subscription.js"
import {
  Array,
  Function,
  HashSet,
  Iterable,
  Match as EffectMatch,
  MutableList,
  Option,
  Tuple,
  flow,
  pipe
} from "effect"

const isFileSubscription = (subscription: Subscription): subscription is FileSubscription =>
  !isNodeSubscription(subscription)

const isZero = strictEqual(0)

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
    const handler = subscription.handler(matchContext)
    const matches = MutableList.make<Match<unknown>>()
    const active = new ActiveNodeSubscription({ matcherIndex, handler, matches })

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

    const found = maybeActive.value.handler(node)

    MutableList.appendAll(maybeActive.value.matches, found)

    return found
  }

const drainActiveMatches =
  (matchesByMatcher: ReadonlyArray<MutableList.MutableList<Match<unknown>>>) =>
  (active: Option.Option<ActiveNodeSubscription>) => {
    if (Option.isNone(active)) {
      return Array.empty<Match<unknown>>()
    }

    const maybeMatches = Array.get(matchesByMatcher, active.value.matcherIndex)

    if (Option.isNone(maybeMatches)) {
      return Array.empty<Match<unknown>>()
    }

    const found = MutableList.toArray(active.value.matches)

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

      const includedSourceFiles = Array.filter(sourceFiles, sourceFileIsActive)
      if (isZero(includedSourceFiles.length)) {
        return Array.empty<Subscription>()
      }

      const planContext = ProgramMatchContext.make({
        program: context.program,
        checker: context.checker,
        projectRoot: context.projectRoot,
        workspaceRoot: context.workspaceRoot,
        sourceFiles: includedSourceFiles
      })

      return matcher.plan(planContext)
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

const commentSyntaxKinds = HashSet.make(
  ts.SyntaxKind.SingleLineCommentTrivia,
  ts.SyntaxKind.MultiLineCommentTrivia
)

const isCommentToken = (scanner: ts.Scanner) => {
  const kind = scanner.getToken()

  return HashSet.has(commentSyntaxKinds, kind)
}

const makeSourceCommentFrom = (scanner: ts.Scanner) => {
  const kind = scanner.getToken()
  const pos = scanner.getTokenStart()
  const end = scanner.getTokenEnd()

  return SourceComment.make({ kind, pos, end })
}

const emptyScanContexts: ReadonlyArray<ScanContext> = Array.empty()

// A slash after these kinds is division because they end an expression; elsewhere it is a regex.
const expressionEndKinds = HashSet.make(
  ts.SyntaxKind.Identifier,
  ts.SyntaxKind.PrivateIdentifier,
  ts.SyntaxKind.NumericLiteral,
  ts.SyntaxKind.BigIntLiteral,
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.TemplateTail,
  ts.SyntaxKind.RegularExpressionLiteral,
  ts.SyntaxKind.ThisKeyword,
  ts.SyntaxKind.TrueKeyword,
  ts.SyntaxKind.FalseKeyword,
  ts.SyntaxKind.NullKeyword,
  ts.SyntaxKind.SuperKeyword,
  ts.SyntaxKind.CloseParenToken,
  ts.SyntaxKind.CloseBracketToken,
  ts.SyntaxKind.PlusPlusToken,
  ts.SyntaxKind.MinusMinusToken
)

const triviaKinds = HashSet.make(
  ts.SyntaxKind.SingleLineCommentTrivia,
  ts.SyntaxKind.MultiLineCommentTrivia,
  ts.SyntaxKind.WhitespaceTrivia,
  ts.SyntaxKind.NewLineTrivia,
  ts.SyntaxKind.ShebangTrivia
)

const slashKinds = HashSet.make(ts.SyntaxKind.SlashToken, ts.SyntaxKind.SlashEqualsToken)

const closeBraceKind = (
  scanner: ts.Scanner,
  contexts: ReadonlyArray<ScanContext>
): readonly [ts.SyntaxKind, ReadonlyArray<ScanContext>] => {
  const head = Array.head(contexts)
  const rest = Array.drop(contexts, 1)
  const closesBrace = Option.contains(head, braceContext)
  const closesTemplateSubstitution = Option.contains(head, templateContext)

  if (closesBrace) {
    return Tuple.make(ts.SyntaxKind.CloseBraceToken, rest)
  }

  if (closesTemplateSubstitution) {
    const templateKind = scanner.reScanTemplateToken(false)
    const staysInTemplate = strictEqual(ts.SyntaxKind.TemplateMiddle)(templateKind)

    return Tuple.make(templateKind, staysInTemplate ? contexts : rest)
  }

  return Tuple.make(ts.SyntaxKind.CloseBraceToken, contexts)
}

// The parser normally drives these rescans because raw scans mis-lex template tails and regexes.
const rescannedKind =
  (scanner: ts.Scanner, contexts: ReadonlyArray<ScanContext>, previous: ts.SyntaxKind) =>
  (kind: ts.SyntaxKind): readonly [ts.SyntaxKind, ReadonlyArray<ScanContext>] => {
    const pushedTemplate: ReadonlyArray<ScanContext> = Array.prepend(contexts, templateContext)
    const pushedBrace: ReadonlyArray<ScanContext> = Array.prepend(contexts, braceContext)

    return pipe(
      EffectMatch.value(kind),
      EffectMatch.when(ts.SyntaxKind.TemplateHead, () => Tuple.make(kind, pushedTemplate)),
      EffectMatch.when(ts.SyntaxKind.OpenBraceToken, () => Tuple.make(kind, pushedBrace)),
      EffectMatch.when(ts.SyntaxKind.CloseBraceToken, () => closeBraceKind(scanner, contexts)),
      EffectMatch.orElse(() => {
        const isSlash = HashSet.has(slashKinds, kind)
        const inRegexPosition = !HashSet.has(expressionEndKinds, previous)
        const rescansAsRegex = isSlash && inRegexPosition

        if (rescansAsRegex) {
          const slashKind = scanner.reScanSlashToken()

          return Tuple.make(slashKind, contexts)
        }

        return Tuple.make(kind, contexts)
      })
    )
  }

const initialScanState: readonly [ReadonlyArray<ScanContext>, ts.SyntaxKind] = Tuple.make(
  emptyScanContexts,
  ts.SyntaxKind.Unknown
)

const sourceComments = (sourceFile: ts.SourceFile): ReadonlyArray<SourceComment> => {
  const sourceText = sourceFile.getFullText()

  const scanner = ts.createScanner(
    sourceFile.languageVersion,
    false,
    sourceFile.languageVariant,
    sourceText
  )

  const tokens = Iterable.unfold(initialScanState, (state) => {
    const [contexts, previous] = state
    const kind = scanner.scan()

    if (strictEqual(ts.SyntaxKind.EndOfFileToken)(kind)) {
      return Option.none()
    }

    const rescan = rescannedKind(scanner, contexts, previous)
    const [effectiveKind, nextContexts] = rescan(kind)
    const isTrivia = HashSet.has(triviaKinds, effectiveKind)
    const nextPrevious = isTrivia ? previous : effectiveKind
    const nextState = Tuple.make(nextContexts, nextPrevious)
    const entry = Tuple.make(scanner, nextState)

    return Option.some(entry)
  })

  return pipe(
    tokens,
    Iterable.filter(isCommentToken),
    Iterable.map(makeSourceCommentFrom),
    Array.fromIterable
  )
}
