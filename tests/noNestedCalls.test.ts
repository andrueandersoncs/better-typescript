import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noNestedCalls } from "../src/rules/noNestedCalls.js"
import type { RuleMatch } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-nested-calls")

const expectedHint =
  "A call whose result feeds another call hides a sequence of steps in one " +
  "expression that reads inside-out. Declare the inner result as a const (or " +
  "a yield* step in a gen block) and pass the name, or restructure data-last " +
  "so the value flows through pipe. Calls that return functions stay inline: " +
  "currying and pipe stages read left-to-right."

// Messages are dynamic (interpolated callee/consumer text), so each is inlined.

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "direct nesting outer(inner())",
    ruleId: "no-nested-calls",
    fileName: "src/cases.ts",
    line: 30,
    column: 22,
    message: "Avoid computing inner inline in the arguments of outer.",
    hint: expectedHint
  },
  {
    name: "deep chain wrap consumed by outer",
    ruleId: "no-nested-calls",
    fileName: "src/cases.ts",
    line: 34,
    column: 21,
    message: "Avoid computing wrap inline in the arguments of outer.",
    hint: expectedHint
  },
  {
    name: "deep chain inner consumed by wrap",
    ruleId: "no-nested-calls",
    fileName: "src/cases.ts",
    line: 34,
    column: 26,
    message: "Avoid computing inner inline in the arguments of wrap.",
    hint: expectedHint
  },
  {
    name: "forwarded through arithmetic outer(inner() + 1)",
    ruleId: "no-nested-calls",
    fileName: "src/cases.ts",
    line: 37,
    column: 26,
    message: "Avoid computing inner inline in the arguments of outer.",
    hint: expectedHint
  },
  {
    name: "forwarded through array literal collect([inner()])",
    ruleId: "no-nested-calls",
    fileName: "src/cases.ts",
    line: 40,
    column: 27,
    message: "Avoid computing inner inline in the arguments of collect.",
    hint: expectedHint
  },
  {
    name: "forwarded through object literal build({ value: inner() })",
    ruleId: "no-nested-calls",
    fileName: "src/cases.ts",
    line: 43,
    column: 31,
    message: "Avoid computing inner inline in the arguments of build.",
    hint: expectedHint
  },
  {
    name: "forwarded through as outer(inner() as number)",
    ruleId: "no-nested-calls",
    fileName: "src/cases.ts",
    line: 46,
    column: 22,
    message: "Avoid computing inner inline in the arguments of outer.",
    hint: expectedHint
  },
  {
    name: "NewExpression as inner register(new Service())",
    ruleId: "no-nested-calls",
    fileName: "src/cases.ts",
    line: 49,
    column: 27,
    message: "Avoid computing new Service inline in the arguments of register.",
    hint: expectedHint
  },
  {
    name: "NewExpression as consumer new Outer(inner())",
    ruleId: "no-nested-calls",
    fileName: "src/cases.ts",
    line: 57,
    column: 31,
    message: "Avoid computing inner inline in the arguments of new Outer.",
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "currying exemption (makeAdder returns function)",
    fileName: "src/allowed.ts",
    line: 16,
    column: 26
  },
  {
    name: "callee position (makeAdder(1) is callee of outer call)",
    fileName: "src/allowed.ts",
    line: 19,
    column: 19
  },
  {
    name: "receiver position (inner() is receiver of .toString)",
    fileName: "src/allowed.ts",
    line: 22,
    column: 29
  },
  {
    name: "result bound to const first",
    fileName: "src/allowed.ts",
    line: 25,
    column: 15
  },
  {
    name: "simple non-call argument",
    fileName: "src/allowed.ts",
    line: 29,
    column: 16
  },
  {
    name: "pipe() first-argument exemption (inner() is data value of pipe)",
    fileName: "src/allowed.ts",
    line: 38,
    column: 20
  }
]

const runFixture = async (): Promise<ReadonlyArray<RuleMatch>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  return workspace.projects.flatMap((project) =>
    runRules(project, [noNestedCalls])
  )
}

test("no-nested-calls reports disallowed and permits allowed fixture items", async () => {
  const matches = await runFixture()
  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
