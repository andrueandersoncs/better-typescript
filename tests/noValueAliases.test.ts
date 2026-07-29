import { test } from "bun:test"
import { noValueAliases } from "@better-typescript/guidance/policies/noValueAliases"
import { type ExpectedDetection, assertPolicyFixtureExpectations } from "./ruleTestAssertions.js"

const message = "Do not declare aliases for existing values."

const hint =
  "Use the referenced value directly. If it needs distinct semantics or one-time evaluation, " +
  "introduce behavior or constructed data instead of another name for the same value."

const expectedDetection = (line: number, column: number): ExpectedDetection => ({
  fileName: "src/cases.ts",
  line,
  column,
  name: "alias",
  message,
  hint
})

const expected = [
  expectedDetection(4, 7),
  expectedDetection(5, 7),
  expectedDetection(6, 14),
  expectedDetection(8, 7),
  expectedDetection(11, 9)
]

test("no-value-aliases reports every const value alias and permits other bindings", () =>
  assertPolicyFixtureExpectations(noValueAliases, expected))
