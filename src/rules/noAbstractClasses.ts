import * as ts from "typescript"
import { And, Kind, Parent } from "../matcher/language.js"
import { MatcherRuleSpec, matcherRule } from "./matcherRule.js"
import { ExampleSnippet, RuleExample } from "./types.js"

const abstractKeyword = new Kind({ kind: ts.SyntaxKind.AbstractKeyword })

const classDeclaration = new Kind({ kind: ts.SyntaxKind.ClassDeclaration })

const onClassDeclaration = new Parent({ term: classDeclaration })

// Matches the abstract keyword token on a class declaration; abstract members and constructor types keep their own parents and never satisfy the guard.
const abstractClassModifier = new And({
  terms: [abstractKeyword, onClassDeclaration]
})

const badExample = new ExampleSnippet({
  filePath: "src/shape.ts",
  code: `export abstract class Shape {
  abstract area(): number
}

export class Circle extends Shape {
  constructor(readonly radius: number) {
    super()
  }

  area(): number { return Math.PI * this.radius ** 2 }
}`
})

const goodExample = new ExampleSnippet({
  filePath: "src/shape.ts",
  code: `export const circleArea = (radius: number): number =>
  Math.PI * radius ** 2`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

const spec = new MatcherRuleSpec({
  id: "no-abstract-classes",
  description:
    "Disallow abstract classes in favor of reusable functions and Effect.",
  matcher: abstractClassModifier,
  message: "Avoid declaring classes as abstract.",
  hint:
    "Declaring an abstract class in first-party code implies object-oriented programming, which is not allowed. To share " +
    "functionality, extract it into reusable functions and export those functions." +
    " To model a union of types, use a type union instead of an abstract class.",
  example
})

export const noAbstractClasses = matcherRule(spec)
