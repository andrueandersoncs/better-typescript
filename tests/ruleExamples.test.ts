import * as assert from "node:assert/strict"
import { test } from "node:test"
import { isFindingRule, rules } from "../src/rules/index.js"
import type { Rule, Finding } from "../src/rules/index.js"
import { compileExampleSet } from "./ruleExamplePrograms.js"

const findingRuleIds = new Set(
  rules.filter(isFindingRule).map((rule) => rule.id)
)

const matchLocation = (match: Finding): string =>
  `[${match.detectorId}] ${match.path}:${match.line}:${match.column}`

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

    const ownRuleBadMatches = bad.ruleMatches.filter(
      (match) => match.detectorId === rule.id
    )
    const matchedBadFiles = new Set(
      ownRuleBadMatches.map((match) => match.path)
    )
    const silentBadSnippets = rule.example.bad
      .map((snippet) => snippet.filePath)
      .filter((filePath) => !matchedBadFiles.has(filePath))

    assert.deepEqual(
      silentBadSnippets,
      [],
      "expected every bad example snippet to trigger its own rule"
    )

    // Good examples are the style guide's prose: they must satisfy every FINDING
    // rule in the guide, not merely the rule they illustrate. Signal rules are
    // measurements consumed by the interpreter, never commands, so they do not
    // constrain documentation.
    const goodFindingMatches = good.ruleMatches.filter((match) =>
      findingRuleIds.has(match.detectorId)
    )

    assert.deepEqual(
      goodFindingMatches.map(matchLocation),
      [],
      "expected good example snippets to satisfy every finding rule in the guide"
    )
  })
}

rules.forEach(registerRuleExampleTest)
