import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noMutableArrayMethods } from "../src/rules/noMutableArrayMethods.js"
import type { RuleMatch } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(
  testDirectory,
  "fixtures",
  "no-mutable-array-methods"
)

const expectedHint =
  "This is a sign that you're doing something fundamentally procedural when you should " +
  "be taking a more functional approach. Use Effect's Array module, such as " +
  "Array.append(), Array.map(), Array.filter(), Array.sort(), or spread syntax " +
  "instead of manipulating an array in place."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "push on number[]",
    ruleId: "no-mutable-array-methods",
    fileName: "src/cases.ts",
    line: 5,
    column: 1,
    message: "Avoid mutating arrays with Array.prototype.push().",
    hint: expectedHint
  },
  {
    name: "shift on Array<T>",
    ruleId: "no-mutable-array-methods",
    fileName: "src/cases.ts",
    line: 9,
    column: 1,
    message: "Avoid mutating arrays with Array.prototype.shift().",
    hint: expectedHint
  },
  {
    name: "reverse on mutable tuple",
    ruleId: "no-mutable-array-methods",
    fileName: "src/cases.ts",
    line: 13,
    column: 1,
    message: "Avoid mutating arrays with Array.prototype.reverse().",
    hint: expectedHint
  },
  {
    name: "sort on generic <T extends number[]>",
    ruleId: "no-mutable-array-methods",
    fileName: "src/cases.ts",
    line: 17,
    column: 3,
    message: "Avoid mutating arrays with Array.prototype.sort().",
    hint: expectedHint
  },
  {
    name: "pop on union of arrays",
    ruleId: "no-mutable-array-methods",
    fileName: "src/cases.ts",
    line: 22,
    column: 1,
    message: "Avoid mutating arrays with Array.prototype.pop().",
    hint: expectedHint
  },
  {
    name: "unshift on intersection with array",
    ruleId: "no-mutable-array-methods",
    fileName: "src/cases.ts",
    line: 26,
    column: 1,
    message: "Avoid mutating arrays with Array.prototype.unshift().",
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "map on real array",
    fileName: "src/allowed.ts",
    line: 5,
    column: 14
  },
  {
    name: "filter on real array",
    fileName: "src/allowed.ts",
    line: 6,
    column: 18
  },
  {
    name: "slice on real array",
    fileName: "src/allowed.ts",
    line: 7,
    column: 14
  },
  {
    name: "concat on real array",
    fileName: "src/allowed.ts",
    line: 8,
    column: 21
  },
  {
    name: "push on non-array object",
    fileName: "src/allowed.ts",
    line: 12,
    column: 1
  },
  {
    name: "sort on class instance",
    fileName: "src/allowed.ts",
    line: 15,
    column: 1
  },
  {
    name: "set.add mutator",
    fileName: "src/allowed.ts",
    line: 19,
    column: 1
  },
  {
    name: "map.set mutator",
    fileName: "src/allowed.ts",
    line: 22,
    column: 1
  },
  {
    name: "map on ReadonlyArray",
    fileName: "src/allowed.ts",
    line: 26,
    column: 23
  },
  {
    name: "slice on ReadonlyArray",
    fileName: "src/allowed.ts",
    line: 27,
    column: 22
  }
]

const runNoMutableArrayMethodsFixture = async (): Promise<
  ReadonlyArray<RuleMatch>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) =>
    runRules(project, [noMutableArrayMethods])
  )
}

test("no-mutable-array-methods reports disallowed and permits allowed fixture items", async () => {
  const matches = await runNoMutableArrayMethodsFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
