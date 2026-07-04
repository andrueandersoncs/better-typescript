import { HashSet } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { transparentWrapperKinds } from "./tsNode.js"
import { isExternalPackageArgument } from "./tsSignature.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, Finding } from "./types.js"

const ruleId = "no-inline-closures"

const sanctionedParentKinds = HashSet.make(
  ts.SyntaxKind.VariableDeclaration,
  ts.SyntaxKind.ArrowFunction
)

const effectiveParent = (node: ts.Node): ts.Node =>
  HashSet.has(transparentWrapperKinds, node.parent.kind)
    ? effectiveParent(node.parent)
    : node.parent

// The context stage runs once per file, so every partial below is shared by all ArrowFunctions the dispatcher feeds to matches.
const arrowFunctionMatches = (context: RuleContext) => {
  const isExternalArgument = isExternalPackageArgument(context.checker)(
    context.program
  )
  const match = createRuleMatch(context)

  const matches = (arrowFunction: ts.ArrowFunction): ReadonlyArray<Finding> => {
    const parent = effectiveParent(arrowFunction)
    const hasSanctionedParent = HashSet.has(sanctionedParentKinds, parent.kind)
    const isExternalCallback = isExternalArgument(arrowFunction)
    const isSanctioned = hasSanctionedParent || isExternalCallback

    return isSanctioned
      ? []
      : [
          match({
            ruleId,
            node: arrowFunction.equalsGreaterThanToken,
            message:
              "Avoid arrow functions outside naming, currying, and third-party callback positions.",
            hint:
              "Name this function as a top-level const and pass it by reference, currying it when it " +
              "needs values from the enclosing scope. Inline arrows are permitted only as arguments " +
              "to third-party functions (effect combinators, node_modules callbacks). When the " +
              "expression sequences several steps, prefer a generator (Option.gen or Effect.gen) " +
              "over nesting functions."
          })
        ]
  }

  return matches
}

const check = onNode([ts.SyntaxKind.ArrowFunction])(ts.isArrowFunction)(
  arrowFunctionMatches
)

const badExample = new ExampleSnippet({
  filePath: "src/users.ts",
  code: `declare const users: ReadonlyArray<{ readonly name: string }>

export const names = users.map((user) => user.name.toUpperCase())`
})

const goodExample = new ExampleSnippet({
  filePath: "src/users.ts",
  code: `import { Array } from "effect"

interface User {
  readonly name: string
}

declare const users: ReadonlyArray<User>

const upperName = (user: User): string =>
  user.name.toUpperCase()

export const names = Array.map(users, upperName)`
})

const goodInlineAtBoundary = new ExampleSnippet({
  filePath: "src/labels.ts",
  code: `import { Array } from "effect"

interface User {
  readonly name: string
}

declare const users: ReadonlyArray<User>

export const labels = Array.map(users, (user) => user.name.toUpperCase())`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample, goodInlineAtBoundary]
})

export const noInlineClosures = new Rule({
  id: ruleId,
  description:
    "Disallow arrow functions outside naming positions (const initializers), currying " +
    "positions (arrow function bodies), and third-party callback positions (arguments to " +
    "functions declared in node_modules).",
  example,
  check
})
