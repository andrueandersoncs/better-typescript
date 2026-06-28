import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { preferEffectFn } from "../src/rules/preferEffectFn.js"
import type { RuleMatch } from "../src/rules/index.js"
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
  `Avoid declaring ${functionName} as a plain function that returns an Effect.`

const makeHint = (functionName: string): string =>
  `Rewrite it as const ${functionName} = Effect.fn("${functionName}")(function* (...) ` +
  "{ ... }) so every call runs inside a traced span. Effect.fn accepts a generator body " +
  "or a function returning an Effect."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "fetchUser.name",
    ruleId: "prefer-effect-fn",
    fileName: "src/cases.ts",
    line: 3,
    column: 14,
    message: makeMessage("fetchUser"),
    hint: makeHint("fetchUser")
  },
  {
    name: "getCount.name",
    ruleId: "prefer-effect-fn",
    fileName: "src/cases.ts",
    line: 4,
    column: 14,
    message: makeMessage("getCount"),
    hint: makeHint("getCount")
  },
  {
    name: "compute.name",
    ruleId: "prefer-effect-fn",
    fileName: "src/cases.ts",
    line: 6,
    column: 14,
    message: makeMessage("compute"),
    hint: makeHint("compute")
  },
  {
    name: "load.name",
    ruleId: "prefer-effect-fn",
    fileName: "src/cases.ts",
    line: 10,
    column: 14,
    message: makeMessage("load"),
    hint: makeHint("load")
  },
  {
    name: "failWith.name",
    ruleId: "prefer-effect-fn",
    fileName: "src/cases.ts",
    line: 13,
    column: 14,
    message: makeMessage("failWith"),
    hint: makeHint("failWith")
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
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

const runPreferEffectFnFixture = async (): Promise<
  ReadonlyArray<RuleMatch>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) =>
    runRules(project, [preferEffectFn])
  )
}

test("prefer-effect-fn reports disallowed and permits allowed fixture items", async () => {
  const matches = await runPreferEffectFnFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
