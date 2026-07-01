import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "prefer-pipe-function"

const pipeMethodCallMatches =
  (context: RuleContext) =>
  (callExpression: ts.CallExpression): ReadonlyArray<RuleMatch> => {
    if (!ts.isPropertyAccessExpression(callExpression.expression)) return []
  
    const isPipeMethod = callExpression.expression.name.text === "pipe"
  
    if (!isPipeMethod) return []
  
    return [
      createRuleMatch(context)({
        ruleId,
        node: callExpression.expression.name,
        message: "Avoid calling .pipe() as a method.",
        hint:
          'Import pipe from "effect" and call it as a standalone function: ' +
          "pipe(value, fn1, fn2) instead of value.pipe(fn1, fn2)."
      })
    ]
  }

const check = onNode([ts.SyntaxKind.CallExpression])(ts.isCallExpression)(pipeMethodCallMatches)

const badExample = new ExampleSnippet({
  filePath: "src/user.ts",
  code: `const program = fetchUser(userId).pipe(
  Effect.map(Struct.get("id")),
  Effect.flatMap(loadProfile)
)`
})

const goodExample = new ExampleSnippet({
  filePath: "src/user.ts",
  code: `const program = pipe(
  fetchUser(userId),
  Effect.map(Struct.get("id")),
  Effect.flatMap(loadProfile)
)`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const preferPipeFunction = new Rule({
  id: ruleId,
  description: "Prefer standalone pipe() function over .pipe() method calls.",
  example,
  check
})
