import { Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { Rule } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-mutable-variable-declarations"

type MutableVariableDeclarationKind = "let" | "var"

const mutableKeywordKinds = new Map<ts.SyntaxKind, MutableVariableDeclarationKind>([
  [ts.SyntaxKind.LetKeyword, "let"],
  [ts.SyntaxKind.VarKeyword, "var"]
])

const tokenMutableKind = (firstToken: ts.Node): Option.Option<MutableVariableDeclarationKind> => {
  const mutableKind = mutableKeywordKinds.get(firstToken.kind)

  return Option.fromNullable(mutableKind)
}

const mutableVariableDeclarationKind = (
  sourceFile: ts.SourceFile,
  declarationList: ts.VariableDeclarationList
): Option.Option<MutableVariableDeclarationKind> => {
  const firstToken = declarationList.getFirstToken(sourceFile)

  return Option.fromNullable(firstToken).pipe(Option.flatMap(tokenMutableKind))
}

const mutableDeclarationRuleMatch =
  (context: RuleContext, declarationList: ts.VariableDeclarationList) =>
  (kind: MutableVariableDeclarationKind): RuleMatch =>
    createRuleMatch(context, {
      ruleId,
      node: declarationList,
      message: `Avoid declaring mutable variables with ${kind}.`,
      hint:
        "Declare multiple const values to represent each state instead of mutating a single " +
        "variable, and use immutable values that are not reassigned."
    })

const mutableDeclarationMatches = (
  declarationList: ts.VariableDeclarationList,
  context: RuleContext
): ReadonlyArray<RuleMatch> =>
  mutableVariableDeclarationKind(context.sourceFile, declarationList).pipe(
    Option.map(mutableDeclarationRuleMatch(context, declarationList)),
    Option.toArray
  )

const check = onNode(
  [ts.SyntaxKind.VariableDeclarationList],
  ts.isVariableDeclarationList,
  mutableDeclarationMatches
)

export const noMutableVariableDeclarations = new Rule({
  id: ruleId,
  description: "Disallow let and var declarations in favor of immutable const bindings.",
  check
})
