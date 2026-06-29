import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { preferPipeFunction } from "../src/rules/preferPipeFunction.js"
import type { RuleMatch } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "prefer-pipe-function")

const message = "Avoid calling .pipe() as a method."

const hint =
  'Import pipe from "effect" and call it as a standalone function: ' +
  "pipe(value, fn1, fn2) instead of value.pipe(fn1, fn2)."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "method pipe on Effect",
    ruleId: "prefer-pipe-function",
    fileName: "src/cases.ts",
    line: 4,
    column: 35,
    message,
    hint
  },
  {
    name: "method pipe on Option",
    ruleId: "prefer-pipe-function",
    fileName: "src/cases.ts",
    line: 7,
    column: 31,
    message,
    hint
  },
  {
    name: "chained method pipe",
    ruleId: "prefer-pipe-function",
    fileName: "src/cases.ts",
    line: 13,
    column: 46,
    message,
    hint
  },
  {
    name: "method pipe on a variable",
    ruleId: "prefer-pipe-function",
    fileName: "src/cases.ts",
    line: 17,
    column: 21,
    message,
    hint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "standalone pipe function call",
    fileName: "src/allowed.ts",
    line: 4,
    column: 17
  },
  {
    name: "standalone pipe with Option",
    fileName: "src/allowed.ts",
    line: 10,
    column: 15
  },
  {
    name: "standalone pipe on a variable",
    fileName: "src/allowed.ts",
    line: 18,
    column: 17
  },
  {
    name: "non-pipe method call",
    fileName: "src/allowed.ts",
    line: 22,
    column: 20
  },
  {
    name: "property access named pipe that is not a call",
    fileName: "src/allowed.ts",
    line: 26,
    column: 18
  }
]

const runPreferPipeFunctionFixture = async (): Promise<
  ReadonlyArray<RuleMatch>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) =>
    runRules(project, [preferPipeFunction])
  )
}

test("prefer-pipe-function reports disallowed and permits allowed fixture items", async () => {
  const matches = await runPreferPipeFunctionFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
