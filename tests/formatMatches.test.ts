import * as assert from "node:assert/strict"
import { test } from "node:test"
import { Option } from "effect"
import { interpretMatches } from "../src/runner/interpretMatches.js"
import { syndromeRegistry } from "../src/syndromes/index.js"
import {
  formatMatchesPage,
  formatMatchesPageJson
} from "../src/output/formatMatches.js"
import { paginateMatches } from "../src/output/paginateMatches.js"
import { Finding, rules } from "../src/rules/index.js"
import { noThrow } from "../src/rules/noThrow.js"
import { preferCurriedDataLastFunctions } from "../src/rules/preferCurriedDataLastFunctions.js"

const interpret = interpretMatches(syndromeRegistry)(rules)

const noThrowMessage = "Avoid throwing errors with throw."
const noThrowHint = "Use Effect errors instead."
const curriedDataLastMessage = "Prefer curried, data-last functions."
const curriedDataLastHint =
  "Split this function into one parameter per arrow, applying configuration first and " +
  "the data argument last. If a third-party callback dictates this shape, keep it " +
  "behind the typed callback boundary."

const firstThrowMatch = new Finding({
  detectorId: "no-throw",
  path: "src/user.ts",
  line: 3,
  column: 5,
  message: noThrowMessage,
  hint: noThrowHint
})

const secondThrowMatch = new Finding({
  detectorId: "no-throw",
  path: "src/order.ts",
  line: 9,
  column: 1,
  message: noThrowMessage,
  hint: noThrowHint
})
const firstCurriedDataLastSignal = new Finding({
  detectorId: "prefer-curried-data-last-functions",
  path: "src/pipeline.ts",
  line: 11,
  column: 17,
  message: curriedDataLastMessage,
  hint: curriedDataLastHint
})

const secondCurriedDataLastSignal = new Finding({
  detectorId: "prefer-curried-data-last-functions",
  path: "src/compose.ts",
  line: 29,
  column: 3,
  message: curriedDataLastMessage,
  hint: curriedDataLastHint
})

const unknownRuleMatch = new Finding({
  detectorId: "not-a-real-rule",
  path: "src/other.ts",
  line: 1,
  column: 1,
  message: "Unknown rule message.",
  hint: "Unknown rule hint."
})

const denseFileMatches = Array.from(
  { length: 10 },
  (_, index) =>
    new Finding({
      detectorId: "no-throw",
      path: "src/hot.ts",
      line: index + 1,
      column: 1,
      message: noThrowMessage,
      hint: noThrowHint
    })
)

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
  const matches = [firstThrowMatch, secondThrowMatch]
  const page = paginateMatches(0)(Option.none())(matches)
  const output = formatMatchesPage(rules)(interpret(matches))(false)(page)
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
  const page = paginateMatches(0)(Option.none())([unknownRuleMatch])
  const output = formatMatchesPage(rules)(interpret([unknownRuleMatch]))(false)(
    page
  )

  assert.ok(output.startsWith("not-a-real-rule\n  Hint: Unknown rule hint."))
  assert.ok(!output.includes("Good ("))
  assert.ok(output.includes("  src/other.ts:1:1"))
})

test("formatMatchesPage keeps the pagination summary on truncated pages", () => {
  const matches = [firstThrowMatch, secondThrowMatch]
  const page = paginateMatches(0)(Option.some(1))(matches)
  const output = formatMatchesPage(rules)(interpret(matches))(false)(page)

  assert.ok(
    output.endsWith(
      "Showing matches 1-1 of 2. Use --offset 1 to see the next page."
    )
  )
})

test("formatMatchesPage leads with diagnoses and collapses consumed matches", () => {
  const page = paginateMatches(0)(Option.none())(denseFileMatches)
  const output = formatMatchesPage(rules)(interpret(denseFileMatches))(false)(
    page
  )

  assert.ok(output.startsWith("Advice"))
  assert.ok(output.includes("  src/hot.ts [file] — high match density"))
  assert.ok(output.includes("    evidence: findings: 10, no-throw: 10"))
  assert.ok(output.includes("  src/hot.ts: 10 matches -> high-match-density"))
  assert.ok(!output.includes("  src/hot.ts:3:1"))
  assert.ok(!output.includes("Good ("))
})

test("formatMatchesPage --detail restores collapsed locations", () => {
  const page = paginateMatches(0)(Option.none())(denseFileMatches)
  const output = formatMatchesPage(rules)(interpret(denseFileMatches))(true)(
    page
  )

  assert.ok(output.startsWith("Advice"))
  assert.ok(output.includes("  src/hot.ts:3:1"))
  assert.ok(!output.includes("matches -> high-match-density"))
})

test("formatMatchesPageJson reports groups with rule metadata", () => {
  const matches = [firstThrowMatch, secondThrowMatch]
  const page = paginateMatches(0)(Option.none())(matches)
  const report = JSON.parse(
    formatMatchesPageJson(rules)(interpret(matches))([])(page)
  )
  const expectedGood = noThrow.example.good.map(plainSnippet)

  assert.deepEqual(report, {
    totalCount: 2,
    startIndex: 1,
    endIndex: 2,
    advice: [],
    groups: [
      {
        ruleId: "no-throw",
        description: noThrow.description,
        hint: noThrowHint,
        good: expectedGood,
        matches: [
          {
            path: "src/user.ts",
            line: 3,
            column: 5,
            message: noThrowMessage
          },
          {
            path: "src/order.ts",
            line: 9,
            column: 1,
            message: noThrowMessage
          }
        ]
      }
    ],
    signals: []
  })
})

test("formatMatchesPageJson reports opted-in signals separately from findings", () => {
  const matches = [firstThrowMatch]
  const signalMatches = [
    firstCurriedDataLastSignal,
    secondCurriedDataLastSignal
  ]
  const page = paginateMatches(0)(Option.none())(matches)
  const report = JSON.parse(
    formatMatchesPageJson(rules)(interpret(matches))(signalMatches)(page)
  )
  const expectedThrowGood = noThrow.example.good.map(plainSnippet)
  const expectedSignalGood =
    preferCurriedDataLastFunctions.example.good.map(plainSnippet)

  assert.deepEqual(report, {
    totalCount: 1,
    startIndex: 1,
    endIndex: 1,
    advice: [],
    groups: [
      {
        ruleId: "no-throw",
        description: noThrow.description,
        hint: noThrowHint,
        good: expectedThrowGood,
        matches: [
          {
            path: "src/user.ts",
            line: 3,
            column: 5,
            message: noThrowMessage
          }
        ]
      }
    ],
    signals: [
      {
        ruleId: "prefer-curried-data-last-functions",
        description: preferCurriedDataLastFunctions.description,
        hint: curriedDataLastHint,
        good: expectedSignalGood,
        matches: [
          {
            path: "src/pipeline.ts",
            line: 11,
            column: 17,
            message: curriedDataLastMessage
          },
          {
            path: "src/compose.ts",
            line: 29,
            column: 3,
            message: curriedDataLastMessage
          }
        ]
      }
    ]
  })
})

test("formatMatchesPageJson carries diagnoses with evidence and full groups", () => {
  const page = paginateMatches(0)(Option.none())(denseFileMatches)
  const report = JSON.parse(
    formatMatchesPageJson(rules)(interpret(denseFileMatches))([])(page)
  )

  assert.equal(report.advice.length, 1)
  assert.equal(report.advice[0].detectorId, "high-match-density")
  assert.equal(report.advice[0].level, "file")
  assert.equal(report.advice[0].path, "src/hot.ts")
  assert.deepEqual(report.advice[0].evidence, [
    { measure: "findings", count: 10 },
    { measure: "no-throw", count: 10 }
  ])
  assert.equal(report.groups.length, 1)
  assert.equal(report.groups[0].matches.length, 10)
})

test("formatMatchesPageJson reports an empty result set", () => {
  const page = paginateMatches(0)(Option.none())([])
  const report = JSON.parse(
    formatMatchesPageJson(rules)(interpret([]))([])(page)
  )

  assert.deepEqual(report, {
    totalCount: 0,
    startIndex: 1,
    endIndex: 0,
    advice: [],
    groups: [],
    signals: []
  })
})
