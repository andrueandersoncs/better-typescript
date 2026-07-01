import { HashSet } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { transparentWrapperKinds } from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-inline-closures"

const sanctionedParentKinds = HashSet.make(
  ts.SyntaxKind.VariableDeclaration,
  ts.SyntaxKind.ArrowFunction
)

const effectiveParent = (node: ts.Node): ts.Node =>
  HashSet.has(transparentWrapperKinds, node.parent.kind)
    ? effectiveParent(node.parent)
    : node.parent

const arrowFunctionMatches =
  (context: RuleContext) =>
  (arrowFunction: ts.ArrowFunction): ReadonlyArray<RuleMatch> => {
    const parent = effectiveParent(arrowFunction)
  
    return HashSet.has(sanctionedParentKinds, parent.kind)
      ? []
      : [
          createRuleMatch(context)({
            ruleId,
            node: arrowFunction.equalsGreaterThanToken,
            message:
              "Avoid arrow functions outside naming and currying positions.",
            hint:
              "Name this function as a top-level const and pass it by reference, currying it when it " +
              "needs values from the enclosing scope. When the expression sequences several steps, " +
              "prefer a generator (Option.gen or Effect.gen) over nesting functions."
          })
        ]
  }

const check = onNode([ts.SyntaxKind.ArrowFunction])(ts.isArrowFunction)(arrowFunctionMatches)

const badExample = new ExampleSnippet({
  filePath: "src/users.ts",
  code: `users.map((user) => user.name.toUpperCase())`
})

const goodExample = new ExampleSnippet({
  filePath: "src/users.ts",
  code: `const upperName = (user: User): string =>
  user.name.toUpperCase()

Array.map(users, upperName)`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const noInlineClosures = new Rule({
  id: ruleId,
  description:
    "Disallow arrow functions outside naming positions (const initializers) and currying " +
    "positions (arrow function bodies).",
  example,
  check
})
