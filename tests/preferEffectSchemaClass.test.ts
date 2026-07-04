import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { preferEffectSchemaClass } from "../src/rules/preferEffectSchemaClass.js"
import type { Finding } from "../src/rules/index.js"
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
  "prefer-effect-schema-class"
)

const makeMessage = (typeName: string, kindLabel: string): string =>
  `Avoid declaring ${typeName} as ${kindLabel} when this project constructs its values.`

const makeHint = (typeName: string): string =>
  `Object literals of this shape are built in src/cases.ts, so ${typeName} is a ` +
  "data definition rather than a boundary type. Replace it with an Effect " +
  `Schema class \u2014 class ${typeName} extends ` +
  `Schema.Class<${typeName}>("${typeName}")({ ... }) {} (or Schema.TaggedClass ` +
  "for tagged variants). The class is both the type and the constructor: keep using " +
  `${typeName} in annotations and build values with new ${typeName}({ ... }) ` +
  "so every construction is validated."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "User.name",
    ruleId: "prefer-effect-schema-class",
    fileName: "src/cases.ts",
    line: 4,
    column: 18,
    message: makeMessage("User", "an interface"),
    hint: makeHint("User")
  },
  {
    name: "Point.name",
    ruleId: "prefer-effect-schema-class",
    fileName: "src/cases.ts",
    line: 11,
    column: 18,
    message: makeMessage("Point", "an interface"),
    hint: makeHint("Point")
  },
  {
    name: "Tag.name",
    ruleId: "prefer-effect-schema-class",
    fileName: "src/cases.ts",
    line: 18,
    column: 18,
    message: makeMessage("Tag", "an interface"),
    hint: makeHint("Tag")
  },
  {
    name: "Account.name",
    ruleId: "prefer-effect-schema-class",
    fileName: "src/cases.ts",
    line: 24,
    column: 18,
    message: makeMessage("Account", "an interface"),
    hint: makeHint("Account")
  },
  {
    name: "Cons.name",
    ruleId: "prefer-effect-schema-class",
    fileName: "src/cases.ts",
    line: 35,
    column: 18,
    message: makeMessage("Cons", "an interface"),
    hint: makeHint("Cons")
  },
  {
    name: "Settings.name",
    ruleId: "prefer-effect-schema-class",
    fileName: "src/cases.ts",
    line: 42,
    column: 13,
    message: makeMessage("Settings", "a type alias"),
    hint: makeHint("Settings")
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "ApiResponse.name",
    fileName: "src/allowed.ts",
    line: 4,
    column: 18
  },
  {
    name: "Settings.name",
    fileName: "src/allowed.ts",
    line: 8,
    column: 13
  },
  {
    name: "Money.name",
    fileName: "src/allowed.ts",
    line: 12,
    column: 14
  },
  {
    name: "ExternalConfig.name",
    fileName: "src/allowed.ts",
    line: 16,
    column: 18
  }
]

const runFixture = async (): Promise<ReadonlyArray<Finding>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) =>
    runRules([preferEffectSchemaClass])(project)
  )
}

test("prefer-effect-schema-class reports disallowed and permits allowed fixture items", async () => {
  const matches = await runFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
