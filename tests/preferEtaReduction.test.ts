import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { preferEtaReduction } from "@better-typescript/checks/preferEtaReduction"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { runCheckOnProject } from "@better-typescript/core/engine/report"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "prefer-eta-reduction")
const expectedMessage =
  "Avoid wrapping a function call that only forwards its argument."
const etaHint =
  "Eta-reduce this arrow to the function value itself (pass f instead of " +
  "(x) => f(x)). If the callee is already partially applied, use that partial " +
  "directly. Do not nest calls."
const flowHint =
  "Replace this nested unary call tower with flow(...steps) left-to-right " +
  "(innermost callee first). Do not nest the calls."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "freeFunction",
    fileName: "src/cases.ts",
    line: 16,
    column: 29,
    message: expectedMessage,
    hint: etaHint
  },
  {
    name: "alreadyApplied",
    fileName: "src/cases.ts",
    line: 19,
    column: 31,
    message: expectedMessage,
    hint: etaHint
  },
  {
    name: "curriedOuter",
    fileName: "src/cases.ts",
    line: 22,
    column: 29,
    message: expectedMessage,
    hint: etaHint
  },
  {
    name: "typePredicateRebind",
    fileName: "src/cases.ts",
    line: 25,
    column: 36,
    message: expectedMessage,
    hint: etaHint
  },
  {
    name: "nestedUnary",
    fileName: "src/cases.ts",
    line: 29,
    column: 28,
    message: expectedMessage,
    hint: flowHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "alreadyEtaReduced",
    fileName: "src/allowed.ts",
    line: 15,
    column: 14
  },
  { name: "methodReceiver", fileName: "src/allowed.ts", line: 17, column: 29 },
  { name: "singletonArray", fileName: "src/allowed.ts", line: 20, column: 28 },
  { name: "propertyRead", fileName: "src/allowed.ts", line: 22, column: 26 },
  { name: "bindThreadBlock", fileName: "src/allowed.ts", line: 25, column: 31 },
  { name: "bracedReturn", fileName: "src/allowed.ts", line: 31, column: 26 },
  { name: "multiArg", fileName: "src/allowed.ts", line: 35, column: 22 },
  { name: "restParam", fileName: "src/allowed.ts", line: 38, column: 23 },
  { name: "paramInCallee", fileName: "src/allowed.ts", line: 41, column: 27 },
  {
    name: "nonForwardAdapter",
    fileName: "src/allowed.ts",
    line: 44,
    column: 3
  },
  {
    name: "instanceCheckerMethod",
    fileName: "src/allowed.ts",
    line: 48,
    column: 35
  }
]

const runPreferEtaReductionFixture = async (): Promise<
  ReadonlyArray<Detection>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(preferEtaReduction)(project))
    )
  )

  return projectElements.flat()
}

test("prefer-eta-reduction reports disallowed and permits allowed fixture items", async () => {
  const signals = await runPreferEtaReductionFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
