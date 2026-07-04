import { HashSet, Option, flow, pipe } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import type { CreateMatch } from "./ruleMatch.js"
import { isSameNode } from "./tsNode.js"
import { callArguments, isCallLikeExpression } from "./tsSignature.js"
import type { CallLikeExpression } from "./tsSignature.js"
import { hasCallSignature } from "./tsType.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, Finding } from "./types.js"

const ruleId = "no-nested-calls"

const valueForwardingKinds = HashSet.make(
  ts.SyntaxKind.ParenthesizedExpression,
  ts.SyntaxKind.AsExpression,
  ts.SyntaxKind.SatisfiesExpression,
  ts.SyntaxKind.NonNullExpression,
  ts.SyntaxKind.ObjectLiteralExpression,
  ts.SyntaxKind.PropertyAssignment,
  ts.SyntaxKind.ShorthandPropertyAssignment,
  ts.SyntaxKind.SpreadAssignment,
  ts.SyntaxKind.ArrayLiteralExpression,
  ts.SyntaxKind.SpreadElement,
  ts.SyntaxKind.ConditionalExpression,
  ts.SyntaxKind.BinaryExpression,
  ts.SyntaxKind.PrefixUnaryExpression,
  ts.SyntaxKind.PostfixUnaryExpression,
  ts.SyntaxKind.AwaitExpression,
  ts.SyntaxKind.YieldExpression,
  ts.SyntaxKind.TypeOfExpression,
  ts.SyntaxKind.VoidExpression,
  ts.SyntaxKind.PropertyAccessExpression,
  ts.SyntaxKind.ElementAccessExpression,
  ts.SyntaxKind.TemplateSpan,
  ts.SyntaxKind.TemplateExpression
)

const consumesAsArgument =
  (node: ts.Node) =>
  (call: CallLikeExpression): boolean =>
    callArguments(call).some(isSameNode(node))

const consumingCall = (node: ts.Node): Option.Option<CallLikeExpression> => {
  const parent = node.parent
  const isCallLike = isCallLikeExpression(parent)

  if (isCallLike) {
    return Option.liftPredicate(consumesAsArgument(node))(parent)
  }

  const isForwarding = HashSet.has(valueForwardingKinds, node.parent.kind)

  return isForwarding ? consumingCall(node.parent) : Option.none()
}

const calleeDisplayText =
  (sourceFile: ts.SourceFile) =>
  (call: CallLikeExpression): string => {
    const calleeText = call.expression.getText(sourceFile)

    return ts.isNewExpression(call) ? `new ${calleeText}` : calleeText
  }

const ruleHint =
  "A call whose result feeds another call hides a sequence of steps in one expression " +
  "that reads inside-out. Declare the inner result as a const (or a yield* step in a " +
  "gen block) and pass the name, or restructure data-last so the value flows through " +
  "pipe. Calls that return functions stay inline: currying and pipe stages read " +
  "left-to-right."

type ProducesCallable = (call: CallLikeExpression) => boolean
type CalleeText = (call: CallLikeExpression) => string

const consumerRuleMatch =
  (producesCallable: ProducesCallable) =>
  (calleeText: CalleeText) =>
  (match: CreateMatch) =>
  (call: CallLikeExpression) =>
  (consumer: CallLikeExpression): Option.Option<Finding> => {
    if (producesCallable(call)) {
      return Option.none()
    }

    const callerExpression = consumer.expression
    const callerName = ts.isIdentifier(callerExpression)
      ? callerExpression.text
      : undefined
    const isPipeName = callerName === "pipe"
    const isCallConsumer = ts.isCallExpression(consumer)
    const isFirstArg = callArguments(consumer)[0] === call
    const isPipeCall = isPipeName && isFirstArg
    const isPipeFirstArg = isCallConsumer && isPipeCall

    if (isPipeFirstArg) {
      return Option.none()
    }

    const callText = calleeText(call)
    const consumerText = calleeText(consumer)
    const ruleMatch = match({
      ruleId,
      node: call,
      message: `Avoid computing ${callText} inline in the arguments of ${consumerText}.`,
      hint: ruleHint
    })

    return Option.some(ruleMatch)
  }

// The context stage runs once per file, so every partial below is shared by all call-like expressions the dispatcher feeds to matches.
const nestedCallMatches = (context: RuleContext) => {
  const checker = context.checker
  const producesCallable = flow(
    (call: CallLikeExpression) => checker.getTypeAtLocation(call),
    hasCallSignature(checker)
  )
  const calleeText = calleeDisplayText(context.sourceFile)
  const match = createRuleMatch(context)
  const consumerMatch = consumerRuleMatch(producesCallable)(calleeText)(match)

  const matches = (call: CallLikeExpression): ReadonlyArray<Finding> =>
    pipe(
      consumingCall(call),
      Option.flatMap(consumerMatch(call)),
      Option.toArray
    )

  return matches
}

const check = onNode([
  ts.SyntaxKind.CallExpression,
  ts.SyntaxKind.NewExpression
])(isCallLikeExpression)(nestedCallMatches)

const badExample = new ExampleSnippet({
  filePath: "src/log.ts",
  code: `declare const parseTimestamp: (raw: string) => Date
declare const formatDate: (date: Date) => string

export const logTimestamp = (raw: string): void => {
  console.log(formatDate(parseTimestamp(raw)))
}`
})

const goodExtractedValues = new ExampleSnippet({
  filePath: "src/log.ts",
  code: `declare const parseTimestamp: (raw: string) => Date
declare const formatDate: (date: Date) => string

export const formatTimestamp = (raw: string): string => {
  const timestamp = parseTimestamp(raw)

  return formatDate(timestamp)
}`
})

const goodEffectPipe = new ExampleSnippet({
  filePath: "src/loadUserPipe.ts",
  code: `import { Effect, Struct, pipe } from "effect"

interface User {
  readonly id: string
}

interface Profile {
  readonly displayName: string
}

declare const userId: string
declare const fetchUser: (id: string) => Effect.Effect<User>
declare const loadProfile: (id: string) => Effect.Effect<Profile>
declare const renderProfile: (profile: Profile) => string

export const program = pipe(
  fetchUser(userId),
  Effect.map(Struct.get("id")),
  Effect.flatMap(loadProfile),
  Effect.map(renderProfile)
)`
})

const goodEffectGen = new ExampleSnippet({
  filePath: "src/loadUserGen.ts",
  code: `import { Effect } from "effect"

interface User {
  readonly id: string
}

interface Profile {
  readonly displayName: string
}

declare const userId: string
declare const fetchUser: (id: string) => Effect.Effect<User>
declare const loadProfile: (id: string) => Effect.Effect<Profile>
declare const renderProfile: (profile: Profile) => string

export const program = Effect.gen(function* () {
  const user = yield* fetchUser(userId)
  const profile = yield* loadProfile(user.id)

  return renderProfile(profile)
})`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExtractedValues, goodEffectPipe, goodEffectGen]
})

export const noNestedCalls = new Rule({
  id: ruleId,
  description:
    "Disallow value-producing calls in the arguments of other calls; function-returning " +
    "calls (currying, pipe stages) stay inline.",
  example,
  check
})
