import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { preferEffectSchemaIs } from "@better-typescript/checks/preferEffectSchemaIs"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { runCheckOnProject } from "@better-typescript/core/engine/report"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "prefer-effect-schema-is")

const message = (valueText: string, operatorText: string, tagText: string): string =>
  `Avoid checking ${valueText}._tag ${operatorText} "${tagText}" directly.`

const hint = (suggestion: string, tagText: string): string =>
  `Replace the tag check with ${suggestion}, using the Effect Schema class for "${tagText}".`

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "isCircle.circleTagCheck",
    fileName: "src/cases.ts",
    line: 5,
    column: 10,
    message: message("shape", "===", "Circle"),
    hint: hint("Schema.is($schema)(shape)", "Circle")
  },
  {
    name: "notSquare.squareTagCheck",
    fileName: "src/cases.ts",
    line: 10,
    column: 10,
    message: message("shape", "!==", "Square"),
    hint: hint("!Schema.is($schema)(shape)", "Square")
  },
  {
    name: "isTriangle.triangleTagCheck",
    fileName: "src/cases.ts",
    line: 15,
    column: 10,
    message: message("shape", "===", "Triangle"),
    hint: hint("Schema.is($schema)(shape)", "Triangle")
  },
  {
    name: "isOk.okTagCheck",
    fileName: "src/cases.ts",
    line: 20,
    column: 10,
    message: message("result.value", "===", "Ok"),
    hint: hint("Schema.is($schema)(result.value)", "Ok")
  },
  {
    name: "isRound.circleTagCheck",
    fileName: "src/cases.ts",
    line: 25,
    column: 10,
    message: message("shape", "===", "Circle"),
    hint: hint("Schema.is($schema)(shape)", "Circle")
  },
  {
    name: "isRound.ellipseTagCheck",
    fileName: "src/cases.ts",
    line: 25,
    column: 37,
    message: message("shape", "===", "Ellipse"),
    hint: hint("Schema.is($schema)(shape)", "Ellipse")
  },
  {
    name: "isPending.pendingTagCheck",
    fileName: "src/cases.ts",
    line: 30,
    column: 10,
    message: message("task", "===", "Pending"),
    hint: hint("Schema.is($schema)(task)", "Pending")
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "looseCheck.looseEquality",
    fileName: "src/allowed.ts",
    line: 5,
    column: 10
  },
  {
    name: "byKind.nonTagProperty",
    fileName: "src/allowed.ts",
    line: 10,
    column: 10
  },
  {
    name: "sameTag.tagVsTag",
    fileName: "src/allowed.ts",
    line: 15,
    column: 10
  },
  {
    name: "tagIsZero.numericLiteral",
    fileName: "src/allowed.ts",
    line: 20,
    column: 10
  },
  {
    name: "isShape.schemaIs",
    fileName: "src/allowed.ts",
    line: 25,
    column: 53
  },
  {
    name: "isSome.thirdPartyEffectTag",
    fileName: "src/externalTag.ts",
    line: 6,
    column: 23
  }
]

const runFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(preferEffectSchemaIs)(project))
    )
  )

  return projectElements.flat()
}

test("prefer-effect-schema-is reports disallowed and permits allowed fixture items", async () => {
  const signals = await runFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
