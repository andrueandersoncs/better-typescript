import { Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { hasCallSignature } from "./tsType.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-nested-calls"

type CallLikeExpression = ts.CallExpression | ts.NewExpression

const isCallLikeExpression = (node: ts.Node): node is CallLikeExpression =>
  ts.isCallExpression(node) || ts.isNewExpression(node)

const valueForwardingKinds = new Set<ts.SyntaxKind>([
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
])

const isSameNode = (node: ts.Node) => (candidate: ts.Node): boolean => candidate === node

const callArguments = (call: CallLikeExpression): ReadonlyArray<ts.Expression> =>
  call.arguments ?? []

const consumesAsArgument = (node: ts.Node) => (call: CallLikeExpression): boolean =>
  callArguments(call).some(isSameNode(node))

const forwardedConsumingCall = (node: ts.Node): Option.Option<CallLikeExpression> =>
  valueForwardingKinds.has(node.parent.kind) ? consumingCall(node.parent) : Option.none()

const consumingCall = (node: ts.Node): Option.Option<CallLikeExpression> => {
  const parent = node.parent

  return isCallLikeExpression(parent)
    ? Option.liftPredicate(consumesAsArgument(node))(parent)
    : forwardedConsumingCall(node)
}

const returnsCallable = (context: RuleContext, call: CallLikeExpression): boolean => {
  const resultType = context.checker.getTypeAtLocation(call)

  return hasCallSignature(context.checker, resultType)
}

const calleeDisplayText = (sourceFile: ts.SourceFile, call: CallLikeExpression): string => {
  const calleeText = call.expression.getText(sourceFile)

  return ts.isNewExpression(call) ? `new ${calleeText}` : calleeText
}

const ruleHint =
  "A call whose result feeds another call hides a sequence of steps in one expression " +
  "that reads inside-out. Declare the inner result as a const (or a yield* step in a " +
  "gen block) and pass the name, or restructure data-last so the value flows through " +
  "pipe. Calls that return functions stay inline: currying and pipe stages read " +
  "left-to-right."

const nestedCallRuleMatch = (
  context: RuleContext,
  call: CallLikeExpression,
  consumer: CallLikeExpression
): RuleMatch => {
  const callText = calleeDisplayText(context.sourceFile, call)
  const consumerText = calleeDisplayText(context.sourceFile, consumer)

  return createRuleMatch(context, {
    ruleId,
    node: call,
    message: `Avoid computing ${callText} inline in the arguments of ${consumerText}.`,
    hint: ruleHint
  })
}

const consumerRuleMatch =
  (context: RuleContext, call: CallLikeExpression) =>
  (consumer: CallLikeExpression): Option.Option<RuleMatch> => {
    if (returnsCallable(context, call)) {
      return Option.none()
    }

    const match = nestedCallRuleMatch(context, call, consumer)

    return Option.some(match)
  }

const nestedCallMatches = (
  call: CallLikeExpression,
  context: RuleContext
): ReadonlyArray<RuleMatch> =>
  consumingCall(call).pipe(Option.flatMap(consumerRuleMatch(context, call)), Option.toArray)

const check = onNode(
  [ts.SyntaxKind.CallExpression, ts.SyntaxKind.NewExpression],
  isCallLikeExpression,
  nestedCallMatches
)

const badExample = new ExampleSnippet({
  filePath: "src/log.ts",
  code: `console.log(formatDate(parseTimestamp(raw)))`
})

const goodExtractedValues = new ExampleSnippet({
  filePath: "src/log.ts",
  code: `const timestamp = parseTimestamp(raw)
const formatted = formatDate(timestamp)
console.log(formatted)`
})

const goodEffectPipe = new ExampleSnippet({
  filePath: "src/loadUser.ts",
  code: `import { Effect, Struct } from "effect"

const program = fetchUser(userId).pipe(
  Effect.map(Struct.get("id")),
  Effect.flatMap(loadProfile),
  Effect.map(renderProfile)
)`
})

const goodEffectGen = new ExampleSnippet({
  filePath: "src/loadUser.ts",
  code: `import { Effect } from "effect"

const program = Effect.gen(function* () {
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
