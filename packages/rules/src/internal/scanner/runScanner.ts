import { Array, Iterable, pipe } from "effect"
import type { RuleContext } from "@better-typescript/core/linter"
import type * as ts from "typescript"
import { astNodesForKindsIn } from "../sources/astNodesForKindsIn.js"
import { isProjectSourceFile } from "../sources/isProjectSourceFile.js"
import { sourceComments } from "../sources/sourceComments.js"
import type { FileSubscription } from "./fileSubscription.js"
import { isNodeSubscription } from "./isNodeSubscription.js"
import type { Match } from "./match.js"
import { MatchContext } from "./matchContext.js"
import type { NodeSubscription } from "./nodeSubscription.js"
import { ProgramMatchContext } from "./programMatchContext.js"
import type { Scanner } from "./scannerData.js"
import type { Subscription } from "./subscription.js"

const runNodeSubscription =
  <Fact>(sourceFile: ts.SourceFile) =>
  (context: MatchContext) =>
  (subscription: NodeSubscription<Fact>) => {
    const handler = subscription.handler(context)
    const nodes = astNodesForKindsIn(sourceFile)(subscription.kinds)

    return pipe(nodes, Iterable.flatMap(handler), Array.fromIterable)
  }

const runFileSubscription =
  <Fact>(context: MatchContext) =>
  (subscription: FileSubscription<Fact>) =>
    subscription.handler(context)

export const runScanner =
  <Fact>(scanner: Scanner<Fact>) =>
  (context: RuleContext): ReadonlyArray<Match<Fact>> => {
    const programSourceFiles = context.program.getSourceFiles()
    const sourceFiles = Array.filter(programSourceFiles, isProjectSourceFile)

    const planContext = ProgramMatchContext.make({
      program: context.program,
      checker: context.checker,
      projectRoot: context.projectRoot,
      workspaceRoot: context.workspaceRoot,
      sourceFiles
    })

    const subscriptions = scanner.plan(planContext)

    const isFileSubscription = (
      subscription: Subscription<Fact>
    ): subscription is FileSubscription<Fact> => !isNodeSubscription(subscription)

    const nodeSubscriptions = Array.filter(subscriptions, isNodeSubscription<Fact>)
    const fileSubscriptions = Array.filter(subscriptions, isFileSubscription)
    const comments = sourceComments(context.sourceFile)

    const matchContext = MatchContext.make({
      program: context.program,
      checker: context.checker,
      projectRoot: context.projectRoot,
      workspaceRoot: context.workspaceRoot,
      sourceFile: context.sourceFile,
      comments
    })

    const nodeMatches = Array.flatMap(
      nodeSubscriptions,
      runNodeSubscription<Fact>(context.sourceFile)(matchContext)
    )

    const fileMatches = Array.flatMap(fileSubscriptions, runFileSubscription(matchContext))

    return Array.appendAll(fileMatches, nodeMatches)
  }
