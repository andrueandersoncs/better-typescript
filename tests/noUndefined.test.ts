import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { noUndefined } from "@better-typescript/checks/noUndefined"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { runCheckOnProject } from "@better-typescript/core/engine/report"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-undefined")
const expectedHint =
  "Use Effect's Option module to model optional values, and convert nullable boundaries " +
  "with Option.fromNullable (incoming) and Option.getOrUndefined (outgoing). When a " +
  "third-party signature forces undefined on a callback, keep the callback inline or " +
  "annotate it with the library's own callback type so the undefined stays in the " +
  "library's declaration, not yours."

const parameterMessage = "Avoid function parameters that accept undefined."
const returnTypeMessage = "Avoid function return types that include undefined."
const returnExpressionMessage = "Avoid returning undefined from functions."
const typeDeclarationMessage =
  "Avoid optional or undefined properties in type declarations."
const comparisonMessage = "Avoid comparing values against undefined."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "parameter optional",
    fileName: "src/cases.ts",
    line: 4,
    column: 15,
    message: parameterMessage,
    hint: expectedHint
  },
  {
    name: "parameter union undefined",
    fileName: "src/cases.ts",
    line: 9,
    column: 17,
    message: parameterMessage,
    hint: expectedHint
  },
  {
    name: "return-type undefined",
    fileName: "src/cases.ts",
    line: 14,
    column: 1,
    message: returnTypeMessage,
    hint: expectedHint
  },
  {
    name: "return-expression undefined",
    fileName: "src/cases.ts",
    line: 20,
    column: 3,
    message: returnExpressionMessage,
    hint: expectedHint
  },
  {
    name: "type-declaration optional property",
    fileName: "src/cases.ts",
    line: 25,
    column: 3,
    message: typeDeclarationMessage,
    hint: expectedHint
  },
  {
    name: "type-declaration union property",
    fileName: "src/cases.ts",
    line: 30,
    column: 3,
    message: typeDeclarationMessage,
    hint: expectedHint
  },
  {
    name: "type-declaration optional mapped type",
    fileName: "src/cases.ts",
    line: 34,
    column: 36,
    message: typeDeclarationMessage,
    hint: expectedHint
  },
  {
    name: "comparison eq undefined",
    fileName: "src/cases.ts",
    line: 38,
    column: 13,
    message: comparisonMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "required non-undefined parameter",
    fileName: "src/allowed.ts",
    line: 4,
    column: 1
  },
  {
    name: "null union parameter not undefined",
    fileName: "src/allowed.ts",
    line: 9,
    column: 17
  },
  {
    name: "null return type not undefined",
    fileName: "src/allowed.ts",
    line: 14,
    column: 1
  },
  {
    name: "non-undefined return value",
    fileName: "src/allowed.ts",
    line: 19,
    column: 1
  },
  {
    name: "bare return in void function",
    fileName: "src/allowed.ts",
    line: 24,
    column: 1
  },
  {
    name: "arrow with null body",
    fileName: "src/allowed.ts",
    line: 29,
    column: 1
  },
  {
    name: "required property no undefined",
    fileName: "src/allowed.ts",
    line: 32,
    column: 1
  },
  {
    name: "minus mapped modifier",
    fileName: "src/allowed.ts",
    line: 37,
    column: 1
  },
  {
    name: "eq null comparison",
    fileName: "src/allowed.ts",
    line: 41,
    column: 16
  },
  {
    name: "typeof undefined comparison",
    fileName: "src/allowed.ts",
    line: 44,
    column: 17
  }
]

const runFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(noUndefined)(project))
    )
  )

  return projectElements.flat()
}

test("no-undefined reports disallowed and permits allowed fixture items", async () => {
  const signals = await runFixture()
  assertDisallowedFixtureItems(signals, disallowedFixtureItems, { sort: true })
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
