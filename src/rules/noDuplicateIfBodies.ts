import { Option, pipe } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import type { CreateMatch } from "./ruleMatch.js"
import {
  alwaysExitsScope,
  hasNoElseBranch,
  unwrapSingleStatementBlock
} from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-duplicate-if-bodies"

const isGuardIfStatement = (
  statement: ts.Statement
): statement is ts.IfStatement =>
  ts.isIfStatement(statement) && hasNoElseBranch(statement)

const statementBefore =
  (statement: ts.Statement) =>
  (block: ts.Block): Option.Option<ts.Statement> => {
    const statementIndex = block.statements.indexOf(statement)

    return Option.fromNullable(block.statements[statementIndex - 1])
  }

const tokenTexts =
  (sourceFile: ts.SourceFile) =>
  (node: ts.Node): ReadonlyArray<string> => {
    if (node.kind === ts.SyntaxKind.SemicolonToken) {
      return []
    }

    const children = node.getChildren(sourceFile)
    const isLeafToken = children.length === 0

    return isLeafToken
      ? [node.getText(sourceFile)]
      : children.flatMap(tokenTexts(sourceFile))
  }

const bodyFingerprint =
  (sourceFile: ts.SourceFile) =>
  (statement: ts.Statement): string => {
    const unwrappedBody = unwrapSingleStatementBlock(statement)

    return tokenTexts(sourceFile)(unwrappedBody).join(" ")
  }

type StatementFingerprint = (statement: ts.Statement) => string
type ConditionText = (ifStatement: ts.IfStatement) => string

const haveIdenticalBodies =
  (fingerprint: StatementFingerprint) =>
  (firstIfStatement: ts.IfStatement) =>
  (secondIfStatement: ts.IfStatement): boolean =>
    fingerprint(firstIfStatement.thenStatement) ===
    fingerprint(secondIfStatement.thenStatement)

const combinedConditionText =
  (conditionText: ConditionText) =>
  (firstIfStatement: ts.IfStatement) =>
  (ifStatement: ts.IfStatement): string =>
    [conditionText(firstIfStatement), conditionText(ifStatement)].join(" || ")

type IfComparator = (
  firstIfStatement: ts.IfStatement
) => (secondIfStatement: ts.IfStatement) => boolean
type IfConditionCombiner = (
  firstIfStatement: ts.IfStatement
) => (ifStatement: ts.IfStatement) => string

const guardDuplicate =
  (sameBody: IfComparator) =>
  (combineConditions: IfConditionCombiner) =>
  (ifStatement: ts.IfStatement) =>
  (previousIfStatement: ts.IfStatement): Option.Option<string> => {
    const hasDuplicateBody = sameBody(previousIfStatement)(ifStatement)
    const bodyExitsScope = alwaysExitsScope(ifStatement.thenStatement)
    const isMergeableDuplicate = [hasDuplicateBody, bodyExitsScope].every(
      Boolean
    )
    const combinedCondition =
      combineConditions(previousIfStatement)(ifStatement)

    return isMergeableDuplicate ? Option.some(combinedCondition) : Option.none()
  }

const isElseOf =
  (ifStatement: ts.IfStatement) =>
  (parent: ts.IfStatement): boolean =>
    parent.elseStatement === ifStatement

const parentBodyDuplicate =
  (sameBody: IfComparator) =>
  (combineConditions: IfConditionCombiner) =>
  (ifStatement: ts.IfStatement) =>
  (parentIfStatement: ts.IfStatement): Option.Option<string> => {
    const hasDuplicateBody = sameBody(parentIfStatement)(ifStatement)
    const combinedCondition = combineConditions(parentIfStatement)(ifStatement)

    return hasDuplicateBody ? Option.some(combinedCondition) : Option.none()
  }

const duplicateIfRuleMatch =
  (match: CreateMatch) =>
  (ifStatement: ts.IfStatement) =>
  (combinedCondition: string): RuleMatch =>
    match({
      ruleId,
      node: ifStatement,
      message:
        "Avoid if branches that repeat the body of the branch before them.",
      hint:
        "These branches are pseudo-duplicates: the bodies are identical and only the " +
        "conditions differ. Combine them into a single branch: " +
        `if (${combinedCondition}) { ... }.`
    })

// The context stage runs once per file, so every partial below is shared by all IfStatements the dispatcher feeds to matches.
const duplicateIfMatches = (context: RuleContext) => {
  const fingerprint = bodyFingerprint(context.sourceFile)
  const conditionText = (ifStatement: ts.IfStatement): string =>
    ifStatement.expression.getText(context.sourceFile)
  const sameBody = haveIdenticalBodies(fingerprint)
  const combineConditions = combinedConditionText(conditionText)
  const guardDup = guardDuplicate(sameBody)(combineConditions)
  const parentDup = parentBodyDuplicate(sameBody)(combineConditions)
  const ruleMatch = duplicateIfRuleMatch(createRuleMatch(context))

  const matches = (ifStatement: ts.IfStatement): ReadonlyArray<RuleMatch> => {
    const guardDuplicateMatch = isGuardIfStatement(ifStatement)
      ? pipe(
          Option.liftPredicate(ts.isBlock)(ifStatement.parent),
          Option.flatMap(statementBefore(ifStatement)),
          Option.filter(isGuardIfStatement),
          Option.flatMap(guardDup(ifStatement))
        )
      : Option.none()

    const bodyMatch = Option.isSome(guardDuplicateMatch)
      ? guardDuplicateMatch
      : pipe(
          Option.liftPredicate(ts.isIfStatement)(ifStatement.parent),
          Option.filter(isElseOf(ifStatement)),
          Option.flatMap(parentDup(ifStatement))
        )

    return pipe(bodyMatch, Option.map(ruleMatch(ifStatement)), Option.toArray)
  }

  return matches
}

const check = onNode([ts.SyntaxKind.IfStatement])(ts.isIfStatement)(
  duplicateIfMatches
)

const badExample = new ExampleSnippet({
  filePath: "src/auth.ts",
  code: `declare const isAdmin: boolean
declare const isModerator: boolean
declare const redirect: (path: string) => Response

export const routeUser = (): Response | undefined => {
  if (isAdmin) {
    return redirect("/dashboard")
  }
  if (isModerator) {
    return redirect("/dashboard")
  }
}`
})

const goodExample = new ExampleSnippet({
  filePath: "src/auth.ts",
  code: `import { Option } from "effect"

declare const isAdmin: boolean
declare const isModerator: boolean
declare const redirect: (path: string) => Response

export const routeUser = (): Option.Option<Response> => {
  const canSeeDashboard = isAdmin || isModerator

  if (canSeeDashboard) {
    const response = redirect("/dashboard")

    return Option.some(response)
  }

  return Option.none()
}`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const noDuplicateIfBodies = new Rule({
  id: ruleId,
  description:
    "Disallow if branches that duplicate the body of the branch directly before them.",
  example,
  check
})
