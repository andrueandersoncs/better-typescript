import * as assert from "node:assert/strict"
import { test } from "node:test"
import { Option } from "effect"
import {
  formatMatchesPage,
  formatMatchesPageJson
} from "../src/output/formatMatches.js"
import { paginateMatches } from "../src/output/paginateMatches.js"
import { RuleMatch, rules } from "../src/rules/index.js"
import { noThrow } from "../src/rules/noThrow.js"

const noThrowMessage = "Avoid throwing errors with throw."
const noThrowHint = "Use Effect errors instead."

const firstThrowMatch = new RuleMatch({
  ruleId: "no-throw",
  fileName: "src/user.ts",
  line: 3,
  column: 5,
  message: noThrowMessage,
  hint: noThrowHint
})

const secondThrowMatch = new RuleMatch({
  ruleId: "no-throw",
  fileName: "src/order.ts",
  line: 9,
  column: 1,
  message: noThrowMessage,
  hint: noThrowHint
})

const unknownRuleMatch = new RuleMatch({
  ruleId: "not-a-real-rule",
  fileName: "src/other.ts",
  line: 1,
  column: 1,
  message: "Unknown rule message.",
  hint: "Unknown rule hint."
})

const indentSnippetLine = (line: string): string => `    ${line}`

const indentedGoodExample = (code: string): string =>
  code.split("\n").map(indentSnippetLine).join("\n")

const plainSnippet = (snippet: {
  readonly filePath: string
  readonly code: string
}): { readonly filePath: string; readonly code: string } => ({
  filePath: snippet.filePath,
  code: snippet.code
})

test("formatMatchesPage renders one group with the rule's good example", () => {
  const page = paginateMatches(
    [firstThrowMatch, secondThrowMatch],
    0,
    Option.none()
  )
  const output = formatMatchesPage(page, rules)
  const goodSnippet = noThrow.example.good[0]
  const expectedLabel = `  Good (${goodSnippet.filePath}):`
  const expectedCode = indentedGoodExample(goodSnippet.code)

  assert.ok(output.startsWith(`no-throw\n  Hint: ${noThrowHint}`))
  assert.ok(output.includes(expectedLabel))
  assert.ok(output.includes(expectedCode))
  assert.ok(output.includes("  src/user.ts:3:5"))
  assert.ok(output.includes("  src/order.ts:9:1"))
})

test("formatMatchesPage omits examples for unknown rule ids", () => {
  const page = paginateMatches([unknownRuleMatch], 0, Option.none())
  const output = formatMatchesPage(page, rules)

  assert.ok(output.startsWith("not-a-real-rule\n  Hint: Unknown rule hint."))
  assert.ok(!output.includes("Good ("))
  assert.ok(output.includes("  src/other.ts:1:1"))
})

test("formatMatchesPage keeps the pagination summary on truncated pages", () => {
  const page = paginateMatches(
    [firstThrowMatch, secondThrowMatch],
    0,
    Option.some(1)
  )
  const output = formatMatchesPage(page, rules)

  assert.ok(
    output.endsWith(
      "Showing matches 1-1 of 2. Use --offset 1 to see the next page."
    )
  )
})

test("formatMatchesPageJson reports groups with rule metadata", () => {
  const page = paginateMatches(
    [firstThrowMatch, secondThrowMatch],
    0,
    Option.none()
  )
  const report = JSON.parse(formatMatchesPageJson(page, rules))
  const expectedGood = noThrow.example.good.map(plainSnippet)

  assert.deepEqual(report, {
    totalCount: 2,
    startIndex: 1,
    endIndex: 2,
    groups: [
      {
        ruleId: "no-throw",
        description: noThrow.description,
        hint: noThrowHint,
        good: expectedGood,
        matches: [
          {
            fileName: "src/user.ts",
            line: 3,
            column: 5,
            message: noThrowMessage
          },
          {
            fileName: "src/order.ts",
            line: 9,
            column: 1,
            message: noThrowMessage
          }
        ]
      }
    ]
  })
})

test("formatMatchesPageJson reports unknown rules with empty metadata", () => {
  const page = paginateMatches([unknownRuleMatch], 0, Option.none())
  const report = JSON.parse(formatMatchesPageJson(page, rules))

  assert.deepEqual(report.groups, [
    {
      ruleId: "not-a-real-rule",
      description: "",
      hint: "Unknown rule hint.",
      good: [],
      matches: [
        {
          fileName: "src/other.ts",
          line: 1,
          column: 1,
          message: "Unknown rule message."
        }
      ]
    }
  ])
})

test("formatMatchesPageJson reports an empty result set", () => {
  const page = paginateMatches([], 0, Option.none())
  const report = JSON.parse(formatMatchesPageJson(page, rules))

  assert.deepEqual(report, {
    totalCount: 0,
    startIndex: 1,
    endIndex: 0,
    groups: []
  })
})
