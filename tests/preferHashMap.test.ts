import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { preferHashMap } from "../src/rules/preferHashMap.js"
import type { Finding } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "prefer-hash-map")

const constructorMessage = "Avoid constructing a built-in Map."

const constructorHint =
  'Use Effect\'s HashMap instead — for example HashMap.fromIterable([["a", 1]]) or ' +
  "HashMap.empty(). HashMap integrates with Equal and Hash traits for structural equality. " +
  "Constructing a Map is permitted only when it is handed to a third-party API that " +
  "requires one."

const mapTypeMessage = "Avoid the built-in Map type."
const readonlyMapTypeMessage = "Avoid the built-in ReadonlyMap type."

const typeHint =
  "Use HashMap.HashMap<K, V> from Effect instead. HashMap integrates with Equal and Hash " +
  "traits for structural equality. Writing the built-in Map type is permitted only where " +
  "it mirrors a third-party contract: ambient declarations and values that cross into a " +
  "third-party call."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "new Map only used locally in boundary file",
    ruleId: "prefer-hash-map",
    fileName: "src/boundary.ts",
    line: 14,
    column: 15,
    message: constructorMessage,
    hint: constructorHint
  },
  {
    name: "non-ambient Map type annotation in boundary file",
    ruleId: "prefer-hash-map",
    fileName: "src/boundary.ts",
    line: 18,
    column: 18,
    message: mapTypeMessage,
    hint: typeHint
  },
  {
    name: "new Map with array literal",
    ruleId: "prefer-hash-map",
    fileName: "src/cases.ts",
    line: 3,
    column: 16,
    message: constructorMessage,
    hint: constructorHint
  },
  {
    name: "new Map empty with type parameters",
    ruleId: "prefer-hash-map",
    fileName: "src/cases.ts",
    line: 8,
    column: 15,
    message: constructorMessage,
    hint: constructorHint
  },
  {
    name: "Map<string, number> type annotation",
    ruleId: "prefer-hash-map",
    fileName: "src/cases.ts",
    line: 10,
    column: 14,
    message: mapTypeMessage,
    hint: typeHint
  },
  {
    name: "new Map with type annotation",
    ruleId: "prefer-hash-map",
    fileName: "src/cases.ts",
    line: 10,
    column: 36,
    message: constructorMessage,
    hint: constructorHint
  },
  {
    name: "ReadonlyMap<string, number> type annotation",
    ruleId: "prefer-hash-map",
    fileName: "src/cases.ts",
    line: 12,
    column: 15,
    message: readonlyMapTypeMessage,
    hint: typeHint
  },
  {
    name: "new Map for ReadonlyMap variable",
    ruleId: "prefer-hash-map",
    fileName: "src/cases.ts",
    line: 12,
    column: 45,
    message: constructorMessage,
    hint: constructorHint
  },
  {
    name: "Map<string, number> parameter type",
    ruleId: "prefer-hash-map",
    fileName: "src/cases.ts",
    line: 15,
    column: 10,
    message: mapTypeMessage,
    hint: typeHint
  },
  {
    name: "ReadonlyMap<string, number> parameter type",
    ruleId: "prefer-hash-map",
    fileName: "src/cases.ts",
    line: 19,
    column: 24,
    message: readonlyMapTypeMessage,
    hint: typeHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "new Set is not a Map",
    fileName: "src/allowed.ts",
    line: 3,
    column: 16
  },
  {
    name: "new WeakMap is not a Map",
    fileName: "src/allowed.ts",
    line: 5,
    column: 14
  },
  {
    name: "new CustomMap is not a Map",
    fileName: "src/allowed.ts",
    line: 8,
    column: 16
  },
  {
    name: "Record type is not a Map",
    fileName: "src/allowed.ts",
    line: 10,
    column: 15
  },
  {
    name: "new Map escaping via variable to JSON.stringify",
    fileName: "src/boundary.ts",
    line: 4,
    column: 17
  },
  {
    name: "new Map as direct argument to JSON.stringify",
    fileName: "src/boundary.ts",
    line: 8,
    column: 31
  },
  {
    name: "ambient Map type reference",
    fileName: "src/boundary.ts",
    line: 11,
    column: 34
  }
]

const runPreferHashMapFixture = async (): Promise<ReadonlyArray<Finding>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) =>
    runRules([preferHashMap])(project)
  )
}

test("prefer-hash-map reports disallowed and permits allowed fixture items", async () => {
  const matches = await runPreferHashMapFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
