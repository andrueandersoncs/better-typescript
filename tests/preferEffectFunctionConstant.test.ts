import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect, Array } from "effect"
import { preferEffectFunctionConstant } from "@better-typescript/checks/preferEffectFunctionConstant"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { runCheckOnProject, loadProject } from "@better-typescript/core/project/loadProject"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "prefer-effect-function-constant")

const message = "Avoid a handwritten constant thunk."

const hintFor = (expression: string): string =>
  `Use Function.constant(${expression}) from Effect when a zero-argument function only returns a stable value. ` +
  "Function.constant captures that value once and returns a zero-argument function."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "concise string literal",
    fileName: "src/cases.ts",
    line: 4,
    column: 30,
    message,
    hint: hintFor('"ready"')
  },
  {
    name: "concise no-substitution template literal",
    fileName: "src/cases.ts",
    line: 5,
    column: 32,
    message,
    hint: hintFor("`ready`")
  },
  {
    name: "concise number literal",
    fileName: "src/cases.ts",
    line: 6,
    column: 30,
    message,
    hint: hintFor("42")
  },
  {
    name: "concise bigint literal",
    fileName: "src/cases.ts",
    line: 7,
    column: 30,
    message,
    hint: hintFor("42n")
  },
  {
    name: "concise true literal",
    fileName: "src/cases.ts",
    line: 8,
    column: 28,
    message,
    hint: hintFor("true")
  },
  {
    name: "concise false literal",
    fileName: "src/cases.ts",
    line: 9,
    column: 29,
    message,
    hint: hintFor("false")
  },
  {
    name: "concise null literal",
    fileName: "src/cases.ts",
    line: 10,
    column: 28,
    message,
    hint: hintFor("null")
  },
  {
    name: "block single-return literal",
    fileName: "src/cases.ts",
    line: 12,
    column: 29,
    message,
    hint: hintFor('"block"')
  },
  {
    name: "function expression single-return literal",
    fileName: "src/cases.ts",
    line: 16,
    column: 42,
    message,
    hint: hintFor("false")
  },
  {
    name: "literal callback position",
    fileName: "src/cases.ts",
    line: 20,
    column: 32,
    message,
    hint: hintFor('"literal callback"')
  },
  {
    name: "preceding same-file const string identifier",
    fileName: "src/cases.ts",
    line: 22,
    column: 36,
    message,
    hint: hintFor("stableStatus")
  },
  {
    name: "preceding same-file const number identifier",
    fileName: "src/cases.ts",
    line: 24,
    column: 35,
    message,
    hint: hintFor("stableCount")
  },
  {
    name: "local Function binding still reports",
    fileName: "src/cases.ts",
    line: 30,
    column: 48,
    message,
    hint: hintFor('"shadowed"')
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "array allocation",
    fileName: "src/allowed.ts",
    line: 6,
    column: 29
  },
  {
    name: "object allocation",
    fileName: "src/allowed.ts",
    line: 7,
    column: 30
  },
  {
    name: "call expression",
    fileName: "src/allowed.ts",
    line: 8,
    column: 28
  },
  {
    name: "new expression",
    fileName: "src/allowed.ts",
    line: 9,
    column: 27
  },
  {
    name: "property read",
    fileName: "src/allowed.ts",
    line: 10,
    column: 32
  },
  {
    name: "mutable identifier",
    fileName: "src/allowed.ts",
    line: 11,
    column: 31
  },
  {
    name: "imported live identifier",
    fileName: "src/allowed.ts",
    line: 12,
    column: 32
  },
  {
    name: "later const identifier",
    fileName: "src/allowed.ts",
    line: 13,
    column: 34
  },
  {
    name: "async literal thunk",
    fileName: "src/allowed.ts",
    line: 17,
    column: 29
  },
  {
    name: "generator literal function expression",
    fileName: "src/allowed.ts",
    line: 19,
    column: 33
  },
  {
    name: "parameterized literal thunk",
    fileName: "src/allowed.ts",
    line: 23,
    column: 37
  },
  {
    name: "generic literal thunk",
    fileName: "src/allowed.ts",
    line: 25,
    column: 31
  },
  {
    name: "block with local statement before return",
    fileName: "src/allowed.ts",
    line: 27,
    column: 37
  },
  {
    name: "block with multiple returns",
    fileName: "src/allowed.ts",
    line: 32,
    column: 33
  },
  {
    name: "destructured const identifier",
    fileName: "src/allowed.ts",
    line: 41,
    column: 36
  },
  {
    name: "captured parameter identifier",
    fileName: "src/allowed.ts",
    line: 43,
    column: 64
  }
]

const runPreferEffectFunctionConstantFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(Array.of(preferEffectFunctionConstant))(project))
    )
  )

  return projectElements.flat()
}

test("prefer-effect-function-constant reports disallowed and permits allowed fixture items", async () => {
  const signals = await runPreferEffectFunctionConstantFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
