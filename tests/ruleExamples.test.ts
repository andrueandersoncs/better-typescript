import * as assert from "node:assert/strict"
import { test } from "node:test"
import { rules } from "../src/rules/index.js"
import type { Rule, RuleMatch } from "../src/rules/index.js"
import { compileExampleSet } from "./ruleExamplePrograms.js"

const matchLocation = (match: RuleMatch): string =>
  `${match.fileName}:${match.line}:${match.column}`

const registerRuleExampleTest = (rule: Rule): void => {
  test(`rule examples: ${rule.id}`, () => {
    assert.ok(
      rule.example.bad.length > 0,
      "expected the rule to document at least one bad example"
    )
    assert.ok(
      rule.example.good.length > 0,
      "expected the rule to document at least one good example"
    )

    const bad = compileExampleSet(rule, "bad")
    const good = compileExampleSet(rule, "good")

    assert.deepEqual(
      bad.compileProblems,
      [],
      "expected every bad example snippet to compile"
    )
    assert.deepEqual(
      good.compileProblems,
      [],
      "expected every good example snippet to compile"
    )

    const matchedBadFiles = new Set(
      bad.ruleMatches.map((match) => match.fileName)
    )
    const silentBadSnippets = rule.example.bad
      .map((snippet) => snippet.filePath)
      .filter((filePath) => !matchedBadFiles.has(filePath))

    assert.deepEqual(
      silentBadSnippets,
      [],
      "expected every bad example snippet to trigger its own rule"
    )
    assert.deepEqual(
      good.ruleMatches.map(matchLocation),
      [],
      "expected good example snippets not to trigger their own rule"
    )
  })
}

rules.forEach(registerRuleExampleTest)
