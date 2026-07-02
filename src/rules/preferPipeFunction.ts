import { Option, pipe } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { symbolDeclaredInEffectPackage } from "./tsSignature.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "prefer-pipe-function"

const isPipeName = (access: ts.PropertyAccessExpression): boolean =>
  access.name.text === "pipe"

// Only effect's Pipeable#pipe is rewritable; Node streams and RxJS observables keep their .pipe().
const isEffectPipeAccess =
  (checker: ts.TypeChecker) =>
  (access: ts.PropertyAccessExpression): boolean => {
    const symbol = checker.getSymbolAtLocation(access.name)

    return pipe(
      Option.fromNullable(symbol),
      Option.exists(symbolDeclaredInEffectPackage)
    )
  }

const pipeMethodCallMatches =
  (context: RuleContext) =>
  (callExpression: ts.CallExpression): ReadonlyArray<RuleMatch> =>
    pipe(
      Option.liftPredicate(ts.isPropertyAccessExpression)(
        callExpression.expression
      ),
      Option.filter(isPipeName),
      Option.filter(isEffectPipeAccess(context.checker)),
      Option.map((access) => [
        createRuleMatch(context)({
          ruleId,
          node: access.name,
          message: "Avoid calling .pipe() as a method.",
          hint:
            'Import pipe from "effect" and call it as a standalone function: ' +
            "pipe(value, fn1, fn2) instead of value.pipe(fn1, fn2)."
        })
      ]),
      Option.getOrElse(() => [])
    )

const check = onNode([ts.SyntaxKind.CallExpression])(ts.isCallExpression)(
  pipeMethodCallMatches
)

const badExample = new ExampleSnippet({
  filePath: "src/user.ts",
  code: `import { Effect, Struct } from "effect"

declare const userId: string
declare const fetchUser: (id: string) => Effect.Effect<{ readonly id: string }>
declare const loadProfile: (id: string) => Effect.Effect<{ readonly bio: string }>

export const program = fetchUser(userId).pipe(
  Effect.map(Struct.get("id")),
  Effect.flatMap(loadProfile)
)`
})

const goodExample = new ExampleSnippet({
  filePath: "src/user.ts",
  code: `import { Effect, Struct, pipe } from "effect"

declare const userId: string
declare const fetchUser: (id: string) => Effect.Effect<{ readonly id: string }>
declare const loadProfile: (id: string) => Effect.Effect<{ readonly bio: string }>

export const program = pipe(
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
  description:
    "Prefer standalone pipe() function over effect's .pipe() method; third-party .pipe() " +
    "methods (Node streams, RxJS) are not effect pipelines and are left alone.",
  example,
  check
})
