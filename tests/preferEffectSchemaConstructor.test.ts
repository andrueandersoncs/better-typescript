import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { preferEffectSchemaConstructor } from "../src/rules/preferEffectSchemaConstructor.js"
import type { Detection } from "../src/detectors/rule.js"
import { runRuleCheckOnProject } from "../src/detectors/report.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(
  testDirectory,
  "fixtures",
  "prefer-effect-schema-constructor"
)

const untaggedMessage = "Avoid returning a raw object literal."

const taggedMessage = (tag: string): string =>
  `Avoid returning a raw "${tag}" object literal.`

const untaggedHint =
  "Define an Effect Schema for this data \u2014 class TheData extends " +
  'Schema.Class<TheData>("TheData")({ ... }) {} \u2014 and construct it through the schema: ' +
  "return new TheData({ ... }) instead of assembling the object by hand."

const taggedHint = (tag: string): string =>
  `Define an Effect Schema for this data \u2014 class ${tag} extends ` +
  `Schema.TaggedClass<${tag}>()("${tag}", { ... }) {} \u2014 and construct it through the ` +
  `schema: return new ${tag}({ ... }) fills in _tag and validates every field.`

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
      Effect.runPromise(
        runRuleCheckOnProject(preferEffectSchemaConstructor)(project)
      )
    )
  )

  return projectElements.flat()
}

test("prefer-effect-schema-constructor reports disallowed and permits allowed fixture items", async () => {
  const signals = await runFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
