import * as ts from "typescript"
import { And, Kind, Or, Parent } from "../matcher/language.js"
import { MatcherRuleSpec, matcherRule } from "./matcherRule.js"
import { ExampleSnippet, RuleExample } from "./types.js"

const asyncKeyword = new Kind({ kind: ts.SyntaxKind.AsyncKeyword })

const functionDeclaration = new Kind({
  kind: ts.SyntaxKind.FunctionDeclaration
})

const functionExpression = new Kind({
  kind: ts.SyntaxKind.FunctionExpression
})

const arrowFunction = new Kind({ kind: ts.SyntaxKind.ArrowFunction })

const methodDeclaration = new Kind({ kind: ts.SyntaxKind.MethodDeclaration })

const asyncCapableFunction = new Or({
  terms: [
    functionDeclaration,
    functionExpression,
    arrowFunction,
    methodDeclaration
  ]
})

const onAsyncCapableFunction = new Parent({ term: asyncCapableFunction })

// Matches the async keyword token itself so the report lands on the modifier, guarded to the function-like parents that can legally carry it.
const asyncModifier = new And({
  terms: [asyncKeyword, onAsyncCapableFunction]
})

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

const spec = new MatcherRuleSpec({
  id: "no-async-functions",
  description:
    "Disallow async functions in favor of Effect-returning functions.",
  matcher: asyncModifier,
  message: "Avoid declaring functions as async.",
  hint:
    "Model asynchronous work with Effect instead of async/await. To integrate with a " +
    "third-party library: wrap incoming promises with Effect.tryPromise; satisfy an " +
    "outgoing Promise-returning callback contract with a non-async function that " +
    "returns Effect.runPromise(effect).",
  example
})

export const noAsyncFunctions = matcherRule(spec)
