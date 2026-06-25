import { Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
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
        "Declaring an abstract class in first-party code implies object-oriented programming, which is not allowed. To share " +
        "functionality, extract it into reusable functions and export those functions." +
        " To model a union of types, use a type union instead of an abstract class."
})

const abstractClassMatches = (
  node: ts.ClassDeclaration,
  context: RuleContext
): ReadonlyArray<RuleMatch> =>
  abstractModifier(node).pipe(Option.map(abstractClassMatch(context)), Option.toArray)

const check = onNode(classDeclarationKinds, isClassDeclaration, abstractClassMatches)

const badExample = new ExampleSnippet({
  filePath: "src/shape.ts",
  code: `abstract class Shape {
  abstract area(): number
}

class Circle extends Shape {
  area(): number { return Math.PI * this.radius ** 2 }
}`
})

const goodExample = new ExampleSnippet({
  filePath: "src/shape.ts",
  code: `const circleArea = (radius: number): number =>
  Math.PI * radius ** 2`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const noAbstractClasses = new Rule({
  id: ruleId,
  description: "Disallow abstract classes in favor of reusable functions and Effect.",
  example,
  check
})
