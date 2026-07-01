import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { preferEffectSchemaConstructor } from "../src/rules/preferEffectSchemaConstructor.js"
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

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "makePoint.return",
    ruleId: "prefer-effect-schema-constructor",
    fileName: "src/cases.ts",
    line: 5,
    column: 10,
    message: untaggedMessage,
    hint: untaggedHint
  },
  {
    name: "circle.return",
    ruleId: "prefer-effect-schema-constructor",
    fileName: "src/cases.ts",
    line: 10,
    column: 10,
    message: taggedMessage("Circle"),
    hint: taggedHint("Circle")
  },
  {
    name: "makeUser.arrowBody",
    ruleId: "prefer-effect-schema-constructor",
    fileName: "src/cases.ts",
    line: 14,
    column: 42,
    message: untaggedMessage,
    hint: untaggedHint
  },
  {
    name: "toResult.whenTrue",
    ruleId: "prefer-effect-schema-constructor",
    fileName: "src/cases.ts",
    line: 18,
    column: 15,
    message: taggedMessage("Ok"),
    hint: taggedHint("Ok")
  },
  {
    name: "toResult.whenFalse",
    ruleId: "prefer-effect-schema-constructor",
    fileName: "src/cases.ts",
    line: 18,
    column: 32,
    message: taggedMessage("Err"),
    hint: taggedHint("Err")
  },
  {
    name: "withDefault.coalescing",
    ruleId: "prefer-effect-schema-constructor",
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

const runFixture = async (): Promise<ReadonlyArray<RuleMatch>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) =>
    runRules([preferEffectSchemaConstructor])(project)
  )
}

test("prefer-effect-schema-constructor reports disallowed and permits allowed fixture items", async () => {
  const matches = await runFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
