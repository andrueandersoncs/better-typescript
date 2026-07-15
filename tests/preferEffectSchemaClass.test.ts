import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect, Array } from "effect"
import { preferEffectSchemaClass } from "@better-typescript/checks/preferEffectSchemaClass"
import { Detection } from "@better-typescript/core/engine/location/data"
import { loadProject, runCheckOnProject } from "@better-typescript/core/project/loadProject"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "prefer-effect-schema-class")

const makeMessage = (typeName: string, kindLabel: string): string =>
  `Avoid declaring ${typeName} as ${kindLabel} when this project constructs its values.`

const makeHint = (typeName: string): string =>
  `Object literals of this shape are built in src/cases.ts, so ${typeName} is a ` +
  "data definition rather than a boundary type. Replace it with an Effect " +
  `Schema class \u2014 class ${typeName} extends ` +
  `Schema.Class<${typeName}>("${typeName}")({ ... }) {} (or Schema.TaggedClass ` +
  "for tagged variants). The class is both the type and the constructor: keep using " +
  `${typeName} in annotations and build values with new ${typeName}({ ... }) ` +
  "so every construction is validated. When the shape must hold process-bound " +
  "runtime values (streams, functions, ts compiler objects), extend Data.Class " +
  "instead, or Data.TaggedClass when the runtime-only data needs a _tag. Both " +
  "preserve the class-as-type-and-constructor discipline without schema validation."

const tupleTypeHint =
  "Any tuple-shaped data can be converted to a class with named fields, making each " +
  "value's meaning explicit instead of positional. Replace the tuple alias with an " +
  "Effect Schema class — for example class ExampleClass extends " +
  'Schema.Class<ExampleClass>("ExampleClass")({ myString: Schema.String, ' +
  "myNumber: Schema.Number }) {} — or Schema.TaggedClass for a tagged variant. " +
  "When fields hold process-bound runtime values, use Data.Class — class " +
  "ExampleClass extends Data.Class<{ readonly stream: Stream.Stream<string> }> {} — " +
  "or Data.TaggedClass for a process-bound tagged variant — class " +
  'ExampleClass extends Data.TaggedClass("ExampleClass")<{ readonly stream: ' +
  "Stream.Stream<string> }> {}."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "User.name",
    fileName: "src/cases.ts",
    line: 4,
    column: 18,
    message: makeMessage("User", "an interface"),
    hint: makeHint("User")
  },
  {
    name: "Point.name",
    fileName: "src/cases.ts",
    line: 11,
    column: 18,
    message: makeMessage("Point", "an interface"),
    hint: makeHint("Point")
  },
  {
    name: "Tag.name",
    fileName: "src/cases.ts",
    line: 18,
    column: 18,
    message: makeMessage("Tag", "an interface"),
    hint: makeHint("Tag")
  },
  {
    name: "Account.name",
    fileName: "src/cases.ts",
    line: 24,
    column: 18,
    message: makeMessage("Account", "an interface"),
    hint: makeHint("Account")
  },
  {
    name: "Cons.name",
    fileName: "src/cases.ts",
    line: 35,
    column: 18,
    message: makeMessage("Cons", "an interface"),
    hint: makeHint("Cons")
  },
  {
    name: "Settings.name",
    fileName: "src/cases.ts",
    line: 42,
    column: 13,
    message: makeMessage("Settings", "a type alias"),
    hint: makeHint("Settings")
  },
  {
    name: "ExampleTuple.name",
    fileName: "src/cases.ts",
    line: 46,
    column: 13,
    message: "Avoid declaring ExampleTuple as a tuple type alias.",
    hint: tupleTypeHint
  },
  {
    name: "ReadonlyExampleTuple.name",
    fileName: "src/cases.ts",
    line: 50,
    column: 13,
    message: "Avoid declaring ReadonlyExampleTuple as a tuple type alias.",
    hint: tupleTypeHint
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

const runFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(Array.of(preferEffectSchemaClass))(project))
    )
  )

  return projectElements.flat()
}

test("prefer-effect-schema-class reports disallowed and permits allowed fixture items", async () => {
  const signals = await runFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
