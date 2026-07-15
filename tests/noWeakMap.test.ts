import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect, Array } from "effect"
import { noWeakMap } from "@better-typescript/checks/noWeakMap"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { loadProject, runCheckOnProject } from "@better-typescript/core/project/loadProject"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-weak-map")

const message = "Avoid WeakMap because it keeps mutable state outside Effect."

const hint =
  "Store immutable state in an Effect Ref instead. Use SynchronizedRef when updates are " +
  "effectful, or SubscriptionRef when consumers need a stream of changes. Create the " +
  "reference inside an Effect or Layer instead of retaining a module-level WeakMap."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "module-level WeakMap construction",
    fileName: "src/cases.ts",
    line: 3,
    column: 28,
    message,
    hint
  },
  {
    name: "WeakMap type annotation",
    fileName: "src/cases.ts",
    line: 5,
    column: 22,
    message,
    hint
  },
  {
    name: "block-local WeakMap construction",
    fileName: "src/cases.ts",
    line: 8,
    column: 26,
    message,
    hint
  },
  {
    name: "WeakMap type alias target",
    fileName: "src/cases.ts",
    line: 13,
    column: 21,
    message,
    hint
  },
  {
    name: "WeakMap constructor reference",
    fileName: "src/cases.ts",
    line: 15,
    column: 28,
    message,
    hint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "module-level Ref",
    fileName: "src/allowed.ts",
    line: 3,
    column: 24
  },
  {
    name: "Effect-created Ref",
    fileName: "src/allowed.ts",
    line: 8,
    column: 24
  },
  {
    name: "WeakSet is not WeakMap",
    fileName: "src/allowed.ts",
    line: 13,
    column: 21
  },
  {
    name: "first-party WeakMap-named value",
    fileName: "src/allowed.ts",
    line: 19,
    column: 16
  }
]

const runFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(Array.of(noWeakMap))(project))
    )
  )

  return projectElements.flat()
}

test("no-weak-map reports disallowed and permits allowed fixture items", async () => {
  const detections = await runFixture()

  assertDisallowedFixtureItems(detections, disallowedFixtureItems)
  assertAllowedFixtureItems(detections, allowedFixtureItems)
})
