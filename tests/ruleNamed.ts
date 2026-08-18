import * as assert from "node:assert/strict"
import { builtinRules } from "@better-typescript/rules/builtinRules"

export const ruleNamed = (name: string) => {
  const rule = builtinRules.find((candidate) => candidate.name === name)

  assert.ok(rule, `Expected built-in rule ${name}.`)

  return rule
}
