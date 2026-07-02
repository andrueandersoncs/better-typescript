import { Option, pipe } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import type { CreateMatch } from "./ruleMatch.js"
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
  (match: CreateMatch) =>
  (keyword: ts.ModifierLike): RuleMatch =>
    match({
      ruleId,
      node: keyword,
      message: "Avoid declaring functions as async.",
      hint:
        "Model asynchronous work with Effect instead of async/await. To integrate with a " +
        "third-party library: wrap incoming promises with Effect.tryPromise; satisfy an " +
        "outgoing Promise-returning callback contract with a non-async function that " +
        "returns Effect.runPromise(effect)."
    })

// The context stage runs once per file, so the specialized rule match is shared by every async-capable function the dispatcher feeds to matches.
const asyncFunctionMatches = (context: RuleContext) => {
  const ruleMatch = asyncFunctionMatch(createRuleMatch(context))

  const matches = (node: AsyncCapableFunction): ReadonlyArray<RuleMatch> => {
    const modifiers = ts.getModifiers(node)

    return pipe(
      Option.fromNullable(modifiers),
      Option.flatMap(findAsyncModifier),
      Option.map(ruleMatch),
      Option.toArray
    )
  }

  return matches
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
