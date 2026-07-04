import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { preferEffectFn } from "../src/rules/preferEffectFn.js"
import type { Finding } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "prefer-effect-fn")

const makeMessage = (functionName: string): string =>
  `Avoid wrapping the body of ${functionName} in Effect.gen; use Effect.fn.`

const makeHint = (functionName: string): string =>
  `Rewrite it as const ${functionName} = Effect.fn("${functionName}")(function* (...) ` +
  "{ ... }): Effect.fn subsumes the Effect.gen wrapper and runs every call inside a " +
  "traced span."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "compute.name",
    ruleId: "prefer-effect-fn",
    fileName: "src/cases.ts",
    line: 6,
    column: 14,
    message: makeMessage("compute"),
    hint: makeHint("compute")
  }
]

// fetchUser/getCount/load/failWith build Effects with plain combinators (no
// Effect.gen wrapper), so the narrowed rule leaves them alone.
const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "cases.fetchUser.name",
    fileName: "src/cases.ts",
    line: 3,
    column: 14
  },
  {
    name: "cases.getCount.name",
    fileName: "src/cases.ts",
    line: 4,
    column: 14
  },
  {
    name: "cases.load.name",
    fileName: "src/cases.ts",
    line: 10,
    column: 14
  },
  {
    name: "cases.failWith.name",
    fileName: "src/cases.ts",
    line: 13,
    column: 14
  },
  {
    name: "effectFn.fetchUser.name",
    fileName: "src/allowed.ts",
    line: 3,
    column: 14
  },
  {
    name: "ready.name",
    fileName: "src/allowed.ts",
    line: 4,
    column: 14
  },
  {
    name: "increment.name",
    fileName: "src/allowed.ts",
    line: 5,
    column: 14
  },
  {
    name: "loadAsync.name",
    fileName: "src/allowed.ts",
    line: 6,
    column: 14
  },
  {
    name: "legacyFetch.name",
    fileName: "src/allowed.ts",
    line: 7,
    column: 17
  }
]

const runPreferEffectFnFixture = async (): Promise<ReadonlyArray<Finding>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) =>
    runRules([preferEffectFn])(project)
  )
}

test("prefer-effect-fn reports disallowed and permits allowed fixture items", async () => {
  const matches = await runPreferEffectFnFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
