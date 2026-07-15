import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { preferDirectBooleanReturn } from "@better-typescript/checks/preferDirectBooleanReturn"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { runCheckOnProject } from "@better-typescript/core/engine/report"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "prefer-direct-boolean-return")

const andFalseHint =
  "Use && instead of branching to false (`cond && value`). When the false " +
  "branch is the then-arm (`cond ? false : value`), negate the condition into " +
  "a named boolean first so `!` and `&&` are not stacked in one expression."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "passesThrough.if",
    fileName: "src/allowed.ts",
    line: 4,
    column: 3,
    message: "Avoid conditional return followed by return false.",
    hint: andFalseHint
  },
  {
    name: "compareReturned.if",
    fileName: "src/allowed.ts",
    line: 19,
    column: 3,
    message: "Avoid conditional return followed by return false.",
    hint: andFalseHint
  },
  {
    name: "returnTrue.if",
    fileName: "src/cases.ts",
    line: 4,
    column: 3,
    message: "Avoid returning true from a conditional branch.",
    hint: "Use the condition as the boolean value instead: return (n > 0)."
  },
  {
    name: "returnFalse.if",
    fileName: "src/cases.ts",
    line: 11,
    column: 3,
    message: "Avoid returning false from a conditional branch.",
    hint: "Use the condition as the boolean value instead: return !(size > 0)."
  },
  {
    name: "ifElseBooleanThen.if",
    fileName: "src/cases.ts",
    line: 18,
    column: 3,
    message: "Avoid returning true from a conditional branch.",
    hint: "Use the condition as the boolean value instead: return (ready)."
  },
  {
    name: "parenthesizedTrue.if",
    fileName: "src/cases.ts",
    line: 26,
    column: 3,
    message: "Avoid returning true from a conditional branch.",
    hint: "Use the condition as the boolean value instead: return (n % 2 === 1)."
  },
  {
    name: "bracelessTrue.if",
    fileName: "src/cases.ts",
    line: 33,
    column: 3,
    message: "Avoid returning true from a conditional branch.",
    hint: "Use the condition as the boolean value instead: return (n === 0)."
  },
  {
    name: "ternaryTrueFalse.conditional",
    fileName: "src/cases.ts",
    line: 38,
    column: 10,
    message: "Avoid returning true from a conditional branch.",
    hint: "Use the condition as the boolean value instead: return (n > 0)."
  },
  {
    name: "ternaryFalseTrue.conditional",
    fileName: "src/cases.ts",
    line: 42,
    column: 10,
    message: "Avoid returning false from a conditional branch.",
    hint: "Use the condition as the boolean value instead: return !(size > 0)."
  },
  {
    name: "ternaryValueElseFalse.conditional",
    fileName: "src/cases.ts",
    line: 46,
    column: 10,
    message: "Avoid conditional return followed by return false.",
    hint: andFalseHint
  },
  {
    name: "ternaryFalseThenValue.conditional",
    fileName: "src/cases.ts",
    line: 50,
    column: 10,
    message: "Avoid conditional return followed by return false.",
    hint: andFalseHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "fromElse.if",
    fileName: "src/allowed.ts",
    line: 11,
    column: 3
  },
  {
    name: "multiStatement.if",
    fileName: "src/allowed.ts",
    line: 29,
    column: 3
  },
  {
    name: "bareReturn.if",
    fileName: "src/allowed.ts",
    line: 37,
    column: 3
  },
  {
    name: "ternaryBothNonLiteral.conditional",
    fileName: "src/allowed.ts",
    line: 43,
    column: 10
  },
  {
    name: "ternarySameLiterals.conditional",
    fileName: "src/allowed.ts",
    line: 47,
    column: 10
  }
]

const runPreferDirectBooleanReturnFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(preferDirectBooleanReturn)(project))
    )
  )

  return projectElements.flat()
}

test("prefer-direct-boolean-return reports disallowed and permits allowed fixture items", async () => {
  const signals = await runPreferDirectBooleanReturnFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
