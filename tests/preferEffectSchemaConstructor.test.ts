import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect, Array } from "effect"
import { preferEffectSchemaConstructor } from "@better-typescript/checks/preferEffectSchemaConstructor"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { loadProject, runCheckOnProject } from "@better-typescript/core/project/loadProject"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "prefer-effect-schema-constructor")

const untaggedMessage = "Avoid returning a raw object literal."

const taggedMessage = (tag: string): string => `Avoid returning a raw "${tag}" object literal.`

const untaggedHint =
  "Reuse an existing Effect Schema whose semantics match this result and construct it through " +
  "that schema. If none exists, reconsider whether this function is a real abstraction or a " +
  "procedural seam that should be collapsed into its owner. Introduce a Schema.Class only " +
  "when the returned data has meaning independent of this object literal."

const taggedHint = (tag: string): string =>
  `Reuse the existing Effect Schema for the "${tag}" protocol variant and construct it ` +
  `through that schema. If no such model exists, first decide whether "${tag}" is an ` +
  "independent protocol concept or this function is only a procedural seam. Introduce a " +
  `Schema.TaggedClass only when the tagged data has semantics beyond this return expression.`

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "makePoint.return",
    fileName: "src/cases.ts",
    line: 5,
    column: 10,
    message: untaggedMessage,
    hint: untaggedHint
  },
  {
    name: "circle.return",
    fileName: "src/cases.ts",
    line: 10,
    column: 10,
    message: taggedMessage("Circle"),
    hint: taggedHint("Circle")
  },
  {
    name: "makeUser.arrowBody",
    fileName: "src/cases.ts",
    line: 14,
    column: 42,
    message: untaggedMessage,
    hint: untaggedHint
  },
  {
    name: "toResult.whenTrue",
    fileName: "src/cases.ts",
    line: 18,
    column: 15,
    message: taggedMessage("Ok"),
    hint: taggedHint("Ok")
  },
  {
    name: "toResult.whenFalse",
    fileName: "src/cases.ts",
    line: 18,
    column: 32,
    message: taggedMessage("Err"),
    hint: taggedHint("Err")
  },
  {
    name: "withDefault.coalescing",
    fileName: "src/cases.ts",
    line: 23,
    column: 19,
    message: untaggedMessage,
    hint: untaggedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "empty.return",
    fileName: "src/allowed.ts",
    line: 5,
    column: 10
  },
  {
    name: "makeCircle.newCircle",
    fileName: "src/allowed.ts",
    line: 10,
    column: 66
  },
  {
    name: "buildConfig.configLiteral",
    fileName: "src/allowed.ts",
    line: 14,
    column: 18
  },
  {
    name: "send.recordArg",
    fileName: "src/allowed.ts",
    line: 20,
    column: 10
  },
  {
    name: "total.add",
    fileName: "src/allowed.ts",
    line: 25,
    column: 10
  }
]

const runFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(Array.of(preferEffectSchemaConstructor))(project))
    )
  )

  return projectElements.flat()
}

test("prefer-effect-schema-constructor reports disallowed and permits allowed fixture items", async () => {
  const signals = await runFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
