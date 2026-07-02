import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { preferHashSet } from "../src/rules/preferHashSet.js"
import type { RuleMatch } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "prefer-hash-set")

const constructorMessage = "Avoid constructing a built-in Set."

const constructorHint =
  "Use Effect's HashSet instead — for example HashSet.fromIterable([1, 2, 3]) or " +
  "HashSet.empty(). HashSet integrates with Equal and Hash traits for structural equality. " +
  "Constructing a Set is permitted only when it is handed to a third-party API that " +
  "requires one."

const setTypeMessage = "Avoid the built-in Set type."
const readonlySetTypeMessage = "Avoid the built-in ReadonlySet type."

const typeHint =
  "Use HashSet.HashSet<T> from Effect instead. HashSet integrates with Equal and Hash " +
  "traits for structural equality. Writing the built-in Set type is permitted only where " +
  "it mirrors a third-party contract: ambient declarations and values that cross into a " +
  "third-party call."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "new Set only used locally in boundary file",
    ruleId: "prefer-hash-set",
    fileName: "src/boundary.ts",
    line: 14,
    column: 15,
    message: constructorMessage,
    hint: constructorHint
  },
  {
    name: "non-ambient Set type annotation in boundary file",
    ruleId: "prefer-hash-set",
    fileName: "src/boundary.ts",
    line: 18,
    column: 18,
    message: setTypeMessage,
    hint: typeHint
  },
  {
    name: "new Set with array literal",
    ruleId: "prefer-hash-set",
    fileName: "src/cases.ts",
    line: 3,
    column: 17,
    message: constructorMessage,
    hint: constructorHint
  },
  {
    name: "new Set empty with type parameter",
    ruleId: "prefer-hash-set",
    fileName: "src/cases.ts",
    line: 5,
    column: 15,
    message: constructorMessage,
    hint: constructorHint
  },
  {
    name: "Set<number> type annotation",
    ruleId: "prefer-hash-set",
    fileName: "src/cases.ts",
    line: 7,
    column: 14,
    message: setTypeMessage,
    hint: typeHint
  },
  {
    name: "new Set with type annotation",
    ruleId: "prefer-hash-set",
    fileName: "src/cases.ts",
    line: 7,
    column: 28,
    message: constructorMessage,
    hint: constructorHint
  },
  {
    name: "ReadonlySet<string> type annotation",
    ruleId: "prefer-hash-set",
    fileName: "src/cases.ts",
    line: 9,
    column: 15,
    message: readonlySetTypeMessage,
    hint: typeHint
  },
  {
    name: "new Set for ReadonlySet variable",
    ruleId: "prefer-hash-set",
    fileName: "src/cases.ts",
    line: 9,
    column: 37,
    message: constructorMessage,
    hint: constructorHint
  },
  {
    name: "Set<number> parameter type",
    ruleId: "prefer-hash-set",
    fileName: "src/cases.ts",
    line: 11,
    column: 25,
    message: setTypeMessage,
    hint: typeHint
  },
  {
    name: "ReadonlySet<string> parameter type",
    ruleId: "prefer-hash-set",
    fileName: "src/cases.ts",
    line: 13,
    column: 23,
    message: readonlySetTypeMessage,
    hint: typeHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "new Map is not a Set",
    fileName: "src/allowed.ts",
    line: 3,
    column: 16
  },
  {
    name: "new WeakSet is not a Set",
    fileName: "src/allowed.ts",
    line: 5,
    column: 14
  },
  {
    name: "new CustomSet is not a Set",
    fileName: "src/allowed.ts",
    line: 8,
    column: 16
  },
  {
    name: "array literal is not a Set",
    fileName: "src/allowed.ts",
    line: 10,
    column: 17
  },
  {
    name: "new Set escaping via variable to JSON.stringify",
    fileName: "src/boundary.ts",
    line: 4,
    column: 17
  },
  {
    name: "new Set as direct argument to JSON.stringify",
    fileName: "src/boundary.ts",
    line: 8,
    column: 31
  },
  {
    name: "ambient Set type reference",
    fileName: "src/boundary.ts",
    line: 11,
    column: 32
  }
]

const runPreferHashSetFixture = async (): Promise<ReadonlyArray<RuleMatch>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) =>
    runRules([preferHashSet])(project)
  )
}

test("prefer-hash-set reports disallowed and permits allowed fixture items", async () => {
  const matches = await runPreferHashSetFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
