import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect, Array } from "effect"
import { preferHashSet } from "@better-typescript/checks/preferHashSet"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { loadProject, runCheckOnProject } from "@better-typescript/core/project/loadProject"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "prefer-hash-set")

const constructorMessage = "Avoid constructing a built-in Set."

const constructorHint =
  "Use Effect's HashSet instead — for example HashSet.fromIterable([1, 2, 3]) or " +
  "HashSet.empty(). HashSet uses Equal and Hash with structural equality by default; " +
  "for reference-identity object members (for example TypeScript checker symbols), wrap " +
  "values with Equal.byReferenceUnsafe at the creation boundary. Constructing a Set is " +
  "permitted only when it is handed to a third-party API that requires one."

const setTypeMessage = "Avoid the built-in Set type."
const readonlySetTypeMessage = "Avoid the built-in ReadonlySet type."

const typeHint =
  "Use HashSet.HashSet<T> from Effect instead. HashSet uses Equal and Hash with " +
  "structural equality by default; wrap reference-identity object members with " +
  "Equal.byReferenceUnsafe at the creation boundary. Writing the built-in Set type is " +
  "permitted only where it mirrors a third-party contract: ambient declarations and " +
  "values that cross into a third-party call."

const mutableHashSetMessage = "Avoid Effect's MutableHashSet."

const mutableHashSetHint =
  "Use Effect's immutable HashSet instead. Build a HashSet with HashSet.empty(), " +
  "HashSet.make(), or HashSet.fromIterable(), and return the value from HashSet.add() " +
  "when updating it."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "new Set only used locally in boundary file",
    fileName: "src/boundary.ts",
    line: 14,
    column: 15,
    message: constructorMessage,
    hint: constructorHint
  },
  {
    name: "non-ambient Set type annotation in boundary file",
    fileName: "src/boundary.ts",
    line: 18,
    column: 18,
    message: setTypeMessage,
    hint: typeHint
  },
  {
    name: "new Set with array literal",
    fileName: "src/cases.ts",
    line: 3,
    column: 17,
    message: constructorMessage,
    hint: constructorHint
  },
  {
    name: "new Set empty with type parameter",
    fileName: "src/cases.ts",
    line: 5,
    column: 15,
    message: constructorMessage,
    hint: constructorHint
  },
  {
    name: "Set<number> type annotation",
    fileName: "src/cases.ts",
    line: 7,
    column: 14,
    message: setTypeMessage,
    hint: typeHint
  },
  {
    name: "new Set with type annotation",
    fileName: "src/cases.ts",
    line: 7,
    column: 28,
    message: constructorMessage,
    hint: constructorHint
  },
  {
    name: "ReadonlySet<string> type annotation",
    fileName: "src/cases.ts",
    line: 9,
    column: 15,
    message: readonlySetTypeMessage,
    hint: typeHint
  },
  {
    name: "new Set for ReadonlySet variable",
    fileName: "src/cases.ts",
    line: 9,
    column: 37,
    message: constructorMessage,
    hint: constructorHint
  },
  {
    name: "Set<number> parameter type",
    fileName: "src/cases.ts",
    line: 11,
    column: 25,
    message: setTypeMessage,
    hint: typeHint
  },
  {
    name: "ReadonlySet<string> parameter type",
    fileName: "src/cases.ts",
    line: 13,
    column: 23,
    message: readonlySetTypeMessage,
    hint: typeHint
  },
  {
    name: "aliased MutableHashSet barrel import",
    fileName: "src/mutable.ts",
    line: 1,
    column: 19,
    message: mutableHashSetMessage,
    hint: mutableHashSetHint
  },
  {
    name: "direct MutableHashSet module import",
    fileName: "src/mutable.ts",
    line: 2,
    column: 35,
    message: mutableHashSetMessage,
    hint: mutableHashSetHint
  },
  {
    name: "MutableHashSet through Effect namespace",
    fileName: "src/mutable.ts",
    line: 7,
    column: 30,
    message: mutableHashSetMessage,
    hint: mutableHashSetHint
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
  },
  {
    name: "immutable HashSet",
    fileName: "src/mutable.ts",
    line: 8,
    column: 19
  }
]

const runPreferHashSetFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(Array.of(preferHashSet))(project))
    )
  )

  return projectElements.flat()
}

test("prefer-hash-set reports disallowed and permits allowed fixture items", async () => {
  const signals = await runPreferHashSetFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
