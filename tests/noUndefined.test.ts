import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noUndefined } from "../src/rules/noUndefined.js"
import type { RuleMatch } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-undefined")
const expectedHint =
  "Use Effect's Option module to model optional values, and convert nullable boundaries " +
  "with Option.fromNullable."

const parameterMessage = "Avoid function parameters that accept undefined."
const returnTypeMessage = "Avoid function return types that include undefined."
const returnExpressionMessage = "Avoid returning undefined from functions."
const typeDeclarationMessage =
  "Avoid optional or undefined properties in type declarations."
const comparisonMessage = "Avoid comparing values against undefined."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "parameter optional",
    ruleId: "no-undefined",
    fileName: "src/cases.ts",
    line: 4,
    column: 15,
    message: parameterMessage,
    hint: expectedHint
  },
  {
    name: "parameter union undefined",
    ruleId: "no-undefined",
    fileName: "src/cases.ts",
    line: 9,
    column: 17,
    message: parameterMessage,
    hint: expectedHint
  },
  {
    name: "return-type undefined",
    ruleId: "no-undefined",
    fileName: "src/cases.ts",
    line: 14,
    column: 1,
    message: returnTypeMessage,
    hint: expectedHint
  },
  {
    name: "return-expression undefined",
    ruleId: "no-undefined",
    fileName: "src/cases.ts",
    line: 20,
    column: 3,
    message: returnExpressionMessage,
    hint: expectedHint
  },
  {
    name: "type-declaration optional property",
    ruleId: "no-undefined",
    fileName: "src/cases.ts",
    line: 25,
    column: 3,
    message: typeDeclarationMessage,
    hint: expectedHint
  },
  {
    name: "type-declaration union property",
    ruleId: "no-undefined",
    fileName: "src/cases.ts",
    line: 30,
    column: 3,
    message: typeDeclarationMessage,
    hint: expectedHint
  },
  {
    name: "type-declaration optional mapped type",
    ruleId: "no-undefined",
    fileName: "src/cases.ts",
    line: 34,
    column: 36,
    message: typeDeclarationMessage,
    hint: expectedHint
  },
  {
    name: "comparison eq undefined",
    ruleId: "no-undefined",
    fileName: "src/cases.ts",
    line: 38,
    column: 13,
    message: comparisonMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "required non-undefined parameter",
    fileName: "src/allowed.ts",
    line: 4,
    column: 1
  },
  {
    name: "null union parameter not undefined",
    fileName: "src/allowed.ts",
    line: 9,
    column: 17
  },
  {
    name: "null return type not undefined",
    fileName: "src/allowed.ts",
    line: 14,
    column: 1
  },
  {
    name: "non-undefined return value",
    fileName: "src/allowed.ts",
    line: 19,
    column: 1
  },
  {
    name: "bare return in void function",
    fileName: "src/allowed.ts",
    line: 24,
    column: 1
  },
  {
    name: "arrow with null body",
    fileName: "src/allowed.ts",
    line: 29,
    column: 1
  },
  {
    name: "required property no undefined",
    fileName: "src/allowed.ts",
    line: 32,
    column: 1
  },
  {
    name: "minus mapped modifier",
    fileName: "src/allowed.ts",
    line: 37,
    column: 1
  },
  {
    name: "eq null comparison",
    fileName: "src/allowed.ts",
    line: 41,
    column: 16
  },
  {
    name: "typeof undefined comparison",
    fileName: "src/allowed.ts",
    line: 44,
    column: 17
  }
]

const runFixture = async (): Promise<ReadonlyArray<RuleMatch>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  return workspace.projects.flatMap((project) => runRules(project, [noUndefined]))
}

test("no-undefined reports disallowed and permits allowed fixture items", async () => {
  const matches = await runFixture()
  assertDisallowedFixtureItems(matches, disallowedFixtureItems, { sort: true })
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
