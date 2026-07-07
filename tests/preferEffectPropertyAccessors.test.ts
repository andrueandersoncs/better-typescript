import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { preferEffectPropertyAccessors } from "../src/rules/preferEffectPropertyAccessors.js"
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
  "prefer-effect-property-accessors"
)

// The hint suffix is the same for all signals
const hintSuffix =
  " from Effect. Use Struct.get for non-record data types, and Record.get or Record.has for records."

const makeMessage = (functionName: string, accessedText: string): string =>
  `Avoid defining ${functionName} only to read ${accessedText}.`

const makeHint = (suggestion: string): string =>
  `Replace this property-access-only function with ${suggestion}${hintSuffix}`

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "getName.user.name",
    fileName: "src/cases.ts",
    line: 1,
    column: 52,
    message: makeMessage("getName", "user.name"),
    hint: makeHint('Struct.get("name")')
  },
  {
    name: "getAge.user.age",
    fileName: "src/cases.ts",
    line: 3,
    column: 10,
    message: makeMessage("getAge", "user.age"),
    hint: makeHint('Struct.get("age")')
  },
  {
    name: "getId.user.id",
    fileName: "src/cases.ts",
    line: 6,
    column: 10,
    message: makeMessage("getId", "user.id"),
    hint: makeHint('Struct.get("id")')
  },
  {
    name: "getLabel.item.label",
    fileName: "src/cases.ts",
    line: 10,
    column: 12,
    message: makeMessage("getLabel", "item.label"),
    hint: makeHint('Struct.get("label")')
  },
  {
    name: "lookup.dict.value",
    fileName: "src/cases.ts",
    line: 13,
    column: 57,
    message: makeMessage("lookup", "dict.value"),
    hint: makeHint('Record.get("value")')
  },
  {
    name: "getKind.shape.kind",
    fileName: "src/cases.ts",
    line: 15,
    column: 10,
    message: makeMessage("getKind", "shape.kind"),
    hint: makeHint('Struct.get("kind")')
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "verboseName.multiStatement",
    fileName: "src/allowed.ts",
    line: 3,
    column: 17
  },
  {
    name: "pick.twoParams",
    fileName: "src/allowed.ts",
    line: 5,
    column: 67
  },
  {
    name: "getCity.nestedAccess",
    fileName: "src/allowed.ts",
    line: 6,
    column: 65
  },
  {
    name: "getByKey.elementAccess",
    fileName: "src/allowed.ts",
    line: 7,
    column: 59
  },
  {
    name: "shout.computedExpression",
    fileName: "src/allowed.ts",
    line: 8,
    column: 50
  }
]

const runPreferEffectPropertyAccessorsFixture = async (): Promise<
  ReadonlyArray<Detection>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(
        runRuleCheckOnProject(preferEffectPropertyAccessors)(project)
      )
    )
  )

  return projectElements.flat()
}

test("prefer-effect-property-accessors reports disallowed and permits allowed fixture items", async () => {
  const signals = await runPreferEffectPropertyAccessorsFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
