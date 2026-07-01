import { Option, pipe } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-async-functions"

type AsyncCapableFunction =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration

const asyncCapableFunctionKinds: ReadonlyArray<ts.SyntaxKind> = [
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration
]

const isAsyncCapableFunction = (node: ts.Node): node is AsyncCapableFunction =>
  [
    ts.isFunctionDeclaration(node),
    ts.isFunctionExpression(node),
    ts.isArrowFunction(node),
    ts.isMethodDeclaration(node)
  ].some(Boolean)

const isAsyncModifier = (modifier: ts.ModifierLike): boolean =>
  modifier.kind === ts.SyntaxKind.AsyncKeyword

const findAsyncModifier = (
  modifiers: ReadonlyArray<ts.ModifierLike>
): Option.Option<ts.ModifierLike> => {
  const modifier = modifiers.find(isAsyncModifier)

  return Option.fromNullable(modifier)
}

const asyncFunctionMatch =
  (context: RuleContext) =>
  (keyword: ts.ModifierLike): RuleMatch =>
    createRuleMatch(context)({
      ruleId,
      node: keyword,
      message: "Avoid declaring functions as async.",
      hint:
        "Model asynchronous work with Effect instead of async/await." +
        " To itegrate with a third-party library that uses async functions, wrap any async functions with Effect.tryPromise."
    })

const asyncFunctionMatches =
  (context: RuleContext) =>
  (node: AsyncCapableFunction): ReadonlyArray<RuleMatch> => {
    const modifiers = ts.getModifiers(node)

    return pipe(
      Option.fromNullable(modifiers),
      Option.flatMap(findAsyncModifier),
      Option.map(asyncFunctionMatch(context)),
      Option.toArray
    )
  }

const check = onNode(asyncCapableFunctionKinds)(isAsyncCapableFunction)(
  asyncFunctionMatches
)

const badExample = new ExampleSnippet({
  filePath: "src/user.ts",
  code: `export const fetchUser = async (id: string) => {
  const response = await fetch(\`/users/\${id}\`)
  return response.json()
}`
})

const goodExample = new ExampleSnippet({
  filePath: "src/user.ts",
  code: `import { HttpClient } from "@effect/platform"
import { Effect } from "effect"

export const fetchUser = Effect.fn("fetchUser")(function* (id: string) {
  const response = yield* HttpClient.get(\`/users/\${id}\`)
  return yield* response.json
})`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const noAsyncFunctions = new Rule({
  id: ruleId,
  description:
    "Disallow async functions in favor of Effect-returning functions.",
  example,
  check
})
