import { HashMap, Option, pipe } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import type { CreateMatch } from "./ruleMatch.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-mutable-variable-declarations"

type MutableVariableDeclarationKind = "let" | "var"

const mutableKeywordKinds: HashMap.HashMap<
  ts.SyntaxKind,
  MutableVariableDeclarationKind
> = HashMap.make(
  [ts.SyntaxKind.LetKeyword, "let"] as const,
  [ts.SyntaxKind.VarKeyword, "var"] as const
)

const tokenMutableKind = (
  firstToken: ts.Node
): Option.Option<MutableVariableDeclarationKind> =>
  HashMap.get(mutableKeywordKinds, firstToken.kind)

const mutableDeclarationRuleMatch =
  (match: CreateMatch) =>
  (declarationList: ts.VariableDeclarationList) =>
  (kind: MutableVariableDeclarationKind): RuleMatch =>
    match({
      ruleId,
      node: declarationList,
      message: `Avoid declaring mutable variables with ${kind}.`,
      hint:
        "Declare multiple const values to represent each state instead of mutating a single " +
        "variable, and use immutable values that are not reassigned."
    })

// The context stage runs once per file, so both partials below are shared by every VariableDeclarationList the dispatcher feeds to matches.
const mutableDeclarationMatches = (context: RuleContext) => {
  const sourceFile = context.sourceFile
  const ruleMatch = mutableDeclarationRuleMatch(createRuleMatch(context))

  const matches = (
    declarationList: ts.VariableDeclarationList
  ): ReadonlyArray<RuleMatch> => {
    const firstToken = declarationList.getFirstToken(sourceFile)

    return pipe(
      Option.fromNullable(firstToken),
      Option.flatMap(tokenMutableKind),
      Option.map(ruleMatch(declarationList)),
      Option.toArray
    )
  }

  return matches
}

const check = onNode([ts.SyntaxKind.VariableDeclarationList])(
  ts.isVariableDeclarationList
)(mutableDeclarationMatches)

const badExample = new ExampleSnippet({
  filePath: "src/cart.ts",
  code: `declare const items: ReadonlyArray<{ readonly price: number }>

export let total = 0

for (const item of items) {
  total += item.price
}`
})

const goodExample = new ExampleSnippet({
  filePath: "src/cart.ts",
  code: `import { Array } from "effect"

declare const items: ReadonlyArray<{ readonly price: number }>

export const total = Array.reduce(
  items,
  0,
  (sum, item) => sum + item.price
)`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const noMutableVariableDeclarations = new Rule({
  id: ruleId,
  description:
    "Disallow let and var declarations in favor of immutable const bindings.",
  example,
  check
})
