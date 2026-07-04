import * as ts from "typescript"
import { Kind } from "../matcher/language.js"
import { MatcherRuleSpec, matcherRule } from "./matcherRule.js"
import { ExampleSnippet, RuleExample } from "./types.js"

const nonNullAssertion = new Kind({ kind: ts.SyntaxKind.NonNullExpression })

const badExample = new ExampleSnippet({
  filePath: "src/firstEven.ts",
  code: `declare const numbers: ReadonlyArray<number>

const isEven = (value: number): boolean => value % 2 === 0

export const firstEven = numbers.find(isEven)!`
})

const goodExample = new ExampleSnippet({
  filePath: "src/firstEven.ts",
  code: `import { Array, Option } from "effect"

declare const numbers: ReadonlyArray<number>

const isEven = (value: number): boolean => value % 2 === 0

const firstEvenNumber = Array.findFirst(numbers, isEven)

export const firstEven = Option.getOrElse(firstEvenNumber, () => 0)`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

const spec = new MatcherRuleSpec({
  id: "no-non-null-assertion",
  description:
    "Disallow non-null assertions (value!): the ! operator erases what the type " +
    "checker knows instead of handling the absent case.",
  matcher: nonNullAssertion,
  message: "Avoid non-null assertions.",
  hint:
    "The ! operator silences the type checker instead of handling the absent case, " +
    "trading a compile-time proof for a runtime crash. Convert the nullable value " +
    "with Option.fromNullable and handle both branches (Option.match, " +
    "Option.getOrElse), or narrow it with a type guard the checker verifies.",
  example
})

// One Kind atom compiled into the ordinary listener machinery by matcherRule; see adrs/0002-rule-bodies-in-the-matcher-language.md for which rules are sentences.
export const noNonNullAssertion = matcherRule(spec)
