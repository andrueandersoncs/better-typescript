import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noRawObjectTypes } from "../src/rules/noRawObjectTypes.js"
import type { Detection } from "../src/detectors/rule.js"
import { runRuleCheckOnProject } from "../src/detectors/report.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-raw-object-types")

const parameterMessage =
  "Parameter uses an anonymous object type instead of a named type."
const parameterHint =
  "Define a named type or interface that describes the data's domain meaning — " +
  "for example ConnectionConfig instead of { host: string, port: number }. " +
  "Name the type after what the data represents, not its structural role " +
  "(avoid names like FooParameters or BarOptions)."

const returnMessage =
  "Return type uses an anonymous object type instead of a named type."
const returnHint =
  "Define a named type or interface that describes the data's domain meaning — " +
  "for example UserProfile instead of { name: string, age: number }. " +
  "Name the type after what the data represents, not its structural role " +
  "(avoid names like FooResult or BarResponse)."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "startServer inline object parameter",
    fileName: "src/cases.ts",
    line: 4,
    column: 29,
    message: parameterMessage,
    hint: parameterHint
  },
  {
    name: "sendEmail inline object parameter",
    fileName: "src/cases.ts",
    line: 8,
    column: 27,
    message: parameterMessage,
    hint: parameterHint
  },
  {
    name: "processData object keyword parameter",
    fileName: "src/cases.ts",
    line: 13,
    column: 29,
    message: parameterMessage,
    hint: parameterHint
  },
  {
    name: "formatUser destructured inline object parameter",
    fileName: "src/cases.ts",
    line: 16,
    column: 28,
    message: parameterMessage,
    hint: parameterHint
  },
  {
    name: "handleInput union containing inline object parameter",
    fileName: "src/cases.ts",
    line: 25,
    column: 29,
    message: parameterMessage,
    hint: parameterHint
  },
  {
    name: "identify intersection containing inline object parameter",
    fileName: "src/cases.ts",
    line: 29,
    column: 26,
    message: parameterMessage,
    hint: parameterHint
  },
  {
    name: "createPair inline object return type",
    fileName: "src/cases.ts",
    line: 35,
    column: 27,
    message: returnMessage,
    hint: returnHint
  },
  {
    name: "toObject object keyword return type",
    fileName: "src/cases.ts",
    line: 44,
    column: 25,
    message: returnMessage,
    hint: returnHint
  },
  {
    name: "tryParse union containing inline object return type",
    fileName: "src/cases.ts",
    line: 47,
    column: 25,
    message: returnMessage,
    hint: returnHint
  },
  {
    name: "Connector.connect inline object parameter",
    fileName: "src/cases.ts",
    line: 52,
    column: 11,
    message: parameterMessage,
    hint: parameterHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "startServer with named interface parameter",
    fileName: "src/allowed.ts",
    line: 7,
    column: 29
  },
  {
    name: "sendEmail with named type alias parameter",
    fileName: "src/allowed.ts",
    line: 16,
    column: 27
  },
  {
    name: "add with primitive parameters",
    fileName: "src/allowed.ts",
    line: 20,
    column: 21
  },
  {
    name: "createAddress with named return type",
    fileName: "src/allowed.ts",
    line: 28,
    column: 30
  },
  {
    name: "createPair with named type alias return",
    fileName: "src/allowed.ts",
    line: 47,
    column: 27
  },
  {
    name: "applyFn with function type parameter",
    fileName: "src/allowed.ts",
    line: 53,
    column: 27
  },
  {
    name: "greetUser with class parameter type",
    fileName: "src/allowed.ts",
    line: 61,
    column: 26
  },
  {
    name: "swapTuple with tuple types",
    fileName: "src/allowed.ts",
    line: 65,
    column: 23
  },
  {
    name: "wrapItems with inline object inside generic type argument",
    fileName: "src/allowed.ts",
    line: 68,
    column: 28
  }
]

const runNoRawObjectTypesFixture = async (): Promise<
  ReadonlyArray<Detection>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runRuleCheckOnProject(noRawObjectTypes)(project))
    )
  )

  return projectElements.flat()
}

test("no-raw-object-types reports disallowed and permits allowed fixture items", async () => {
  const signals = await runNoRawObjectTypesFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems, { sort: true })
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
