import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noAbstractClasses } from "../src/checks/noAbstractClasses.js"
import type { Detection } from "../src/engine/location.js"
import { runCheckOnProject } from "../src/engine/report.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-abstract-classes")

const message = "Avoid declaring classes as abstract."

const hint =
  "Declaring an abstract class in first-party code implies object-oriented programming, " +
  "which is not allowed. To share functionality, extract it into reusable functions and " +
  "export those functions. To model a union of types, use a type union instead of an " +
  "abstract class."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "Shape abstract class declaration",
    fileName: "src/cases.ts",
    line: 3,
    column: 1,
    message,
    hint
  },
  {
    name: "Repository exported abstract class declaration",
    fileName: "src/cases.ts",
    line: 7,
    column: 8,
    message,
    hint
  },
  {
    name: "BaseError abstract class extending Error",
    fileName: "src/cases.ts",
    line: 11,
    column: 1,
    message,
    hint
  },
  {
    name: "Handler abstract class nested in function",
    fileName: "src/cases.ts",
    line: 16,
    column: 3,
    message,
    hint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "Container concrete class",
    fileName: "src/allowed.ts",
    line: 3,
    column: 1
  },
  {
    name: "DomainError concrete class extending Error",
    fileName: "src/allowed.ts",
    line: 7,
    column: 1
  },
  {
    name: "Person concrete class extending Schema.Class",
    fileName: "src/allowed.ts",
    line: 11,
    column: 1
  },
  {
    name: "Anonymous class expression",
    fileName: "src/allowed.ts",
    line: 15,
    column: 25
  },
  {
    name: "abstract identifier binding",
    fileName: "src/allowed.ts",
    line: 23,
    column: 7
  }
]

const runNoAbstractClassesFixture = async (): Promise<
  ReadonlyArray<Detection>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(noAbstractClasses)(project))
    )
  )

  return projectElements.flat()
}

test("no-abstract-classes reports disallowed and permits allowed fixture items", async () => {
  const signals = await runNoAbstractClassesFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
