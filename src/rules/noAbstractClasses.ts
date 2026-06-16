import { Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { Rule } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-abstract-classes"

const classDeclarationKinds: ReadonlyArray<ts.SyntaxKind> = [ts.SyntaxKind.ClassDeclaration]

const isClassDeclaration = (node: ts.Node): node is ts.ClassDeclaration =>
  ts.isClassDeclaration(node)

const isAbstractModifier = (modifier: ts.ModifierLike): boolean =>
  modifier.kind === ts.SyntaxKind.AbstractKeyword

const findAbstractModifier = (
  modifiers: ReadonlyArray<ts.ModifierLike>
): Option.Option<ts.ModifierLike> => {
  const modifier = modifiers.find(isAbstractModifier)

  return Option.fromNullable(modifier)
}

const abstractModifier = (node: ts.ClassDeclaration): Option.Option<ts.ModifierLike> => {
  const modifiers = ts.getModifiers(node)

  return Option.fromNullable(modifiers).pipe(Option.flatMap(findAbstractModifier))
}

const abstractClassMatch =
  (context: RuleContext) =>
  (keyword: ts.ModifierLike): RuleMatch =>
    createRuleMatch(context, {
      ruleId,
      node: keyword,
      message: "Avoid declaring classes as abstract.",
      hint:
        "An abstract class is object-oriented programming, which is not allowed. To share " +
        "functionality, extract it into reusable functions and export those functions. If you " +
        "need impure functions that produce an effect, model the effect with Effect instead."
    })

const abstractClassMatches = (
  node: ts.ClassDeclaration,
  context: RuleContext
): ReadonlyArray<RuleMatch> =>
  abstractModifier(node).pipe(Option.map(abstractClassMatch(context)), Option.toArray)

const check = onNode(classDeclarationKinds, isClassDeclaration, abstractClassMatches)

export const noAbstractClasses = new Rule({
  id: ruleId,
  description: "Disallow abstract classes in favor of reusable functions and Effect.",
  check
})
