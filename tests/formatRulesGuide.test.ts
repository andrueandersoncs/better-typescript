import * as assert from "node:assert/strict"
import { test } from "node:test"
import {
  formatRulesGuide,
  formatRulesJson
} from "../src/output/formatRulesGuide.js"
import { rules } from "../src/rules/index.js"
import { noThrow } from "../src/rules/noThrow.js"

const plainSnippet = (snippet: {
  readonly filePath: string
  readonly code: string
}): { readonly filePath: string; readonly code: string } => ({
  filePath: snippet.filePath,
  code: snippet.code
})

test("formatRulesGuide opens with the guide heading and rule count", () => {
  const guide = formatRulesGuide(rules)

  assert.ok(guide.startsWith("# Better TypeScript style guide"))
  assert.ok(guide.includes(`enforces ${rules.length} rules`))
})

test("formatRulesGuide has a section for every registered rule", () => {
  const guide = formatRulesGuide(rules)
  const missingRuleIds = rules
    .map((rule) => rule.id)
    .filter((ruleId) => !guide.includes(`## ${ruleId}`))

  assert.deepEqual(missingRuleIds, [])
})

test("formatRulesGuide renders descriptions and labeled example snippets", () => {
  const guide = formatRulesGuide(rules)
  const badSnippet = noThrow.example.bad[0]
  const goodSnippet = noThrow.example.good[0]

  assert.ok(guide.includes(noThrow.description))
  assert.ok(
    guide.includes(
      `Bad (${badSnippet.filePath}):\n\n\`\`\`ts\n${badSnippet.code}\n\`\`\``
    )
  )
  assert.ok(
    guide.includes(
      `Good (${goodSnippet.filePath}):\n\n\`\`\`ts\n${goodSnippet.code}\n\`\`\``
    )
  )
})

test("formatRulesJson documents every rule with its examples", () => {
  const document = JSON.parse(formatRulesJson(rules))
  const documentedIds = document.rules.map(
    (ruleDoc: { readonly id: string }) => ruleDoc.id
  )

  assert.deepEqual(
    documentedIds,
    rules.map((rule) => rule.id)
  )
})

test("formatRulesJson round-trips a rule's id, description, and examples", () => {
  const document = JSON.parse(formatRulesJson(rules))
  const noThrowDoc = document.rules.find(
    (ruleDoc: { readonly id: string }) => ruleDoc.id === "no-throw"
  )

  assert.deepEqual(noThrowDoc, {
    id: noThrow.id,
    description: noThrow.description,
    example: {
      bad: noThrow.example.bad.map(plainSnippet),
      good: noThrow.example.good.map(plainSnippet)
    }
  })
})
