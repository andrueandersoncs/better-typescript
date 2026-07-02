import * as assert from "node:assert/strict"
import { test } from "node:test"
import { rules } from "../src/rules/index.js"
import type { Rule, RuleMatch } from "../src/rules/index.js"
import { compileExampleSet } from "./ruleExamplePrograms.js"

const matchLocation = (match: RuleMatch): string =>
  `[${match.ruleId}] ${match.fileName}:${match.line}:${match.column}`

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
      (match) => match.ruleId === rule.id
    )
    const matchedBadFiles = new Set(
      ownRuleBadMatches.map((match) => match.fileName)
    )
    const silentBadSnippets = rule.example.bad
      .map((snippet) => snippet.filePath)
      .filter((filePath) => !matchedBadFiles.has(filePath))

    assert.deepEqual(
      silentBadSnippets,
      [],
      "expected every bad example snippet to trigger its own rule"
    )

    // Good examples are the style guide's prose: they must satisfy every rule in
    // the guide, not merely the rule they illustrate. A Good example that trips a
    // sibling rule teaches a pattern the linter then rejects.
    assert.deepEqual(
      good.ruleMatches.map(matchLocation),
      [],
      "expected good example snippets to satisfy every rule in the guide"
    )
  })
}

rules.forEach(registerRuleExampleTest)
