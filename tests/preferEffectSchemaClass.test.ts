import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { preferEffectSchemaClass } from "../src/rules/preferEffectSchemaClass.js"
import type { RuleMatch } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "prefer-effect-schema-class")

const makeMessage = (interfaceName: string): string =>
  `Avoid declaring ${interfaceName} as an interface when this project constructs its values.`

const makeHint = (interfaceName: string): string =>
  `Object literals of this shape are built in src/cases.ts, so ${interfaceName} is a ` +
  "data definition rather than a boundary type. Replace the interface with an Effect " +
  `Schema class \u2014 class ${interfaceName} extends ` +
  `Schema.Class<${interfaceName}>("${interfaceName}")({ ... }) {} (or Schema.TaggedClass ` +
  "for tagged variants). The class is both the type and the constructor: keep using " +
  `${interfaceName} in annotations and build values with new ${interfaceName}({ ... }) ` +
  "so every construction is validated."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "User.name",
    ruleId: "prefer-effect-schema-class",
    fileName: "src/cases.ts",
    line: 4,
    column: 18,
    message: makeMessage("User"),
    hint: makeHint("User")
  },
  {
    name: "Point.name",
    ruleId: "prefer-effect-schema-class",
    fileName: "src/cases.ts",
    line: 8,
    column: 18,
    message: makeMessage("Point"),
    hint: makeHint("Point")
  },
  {
    name: "Tag.name",
    ruleId: "prefer-effect-schema-class",
    fileName: "src/cases.ts",
    line: 12,
    column: 18,
    message: makeMessage("Tag"),
    hint: makeHint("Tag")
  },
  {
    name: "Account.name",
    ruleId: "prefer-effect-schema-class",
    fileName: "src/cases.ts",
    line: 16,
    column: 18,
    message: makeMessage("Account"),
    hint: makeHint("Account")
  },
  {
    name: "Cons.name",
    ruleId: "prefer-effect-schema-class",
    fileName: "src/cases.ts",
    line: 21,
    column: 18,
    message: makeMessage("Cons"),
    hint: makeHint("Cons")
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

const runFixture = async (): Promise<ReadonlyArray<RuleMatch>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) => runRules(project, [preferEffectSchemaClass]))
}

test("prefer-effect-schema-class reports disallowed and permits allowed fixture items", async () => {
  const matches = await runFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
