import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noMutation } from "../src/checks/noMutation.js"
import type { Detection } from "../src/engine/location.js"
import { runCheckOnProject } from "../src/engine/report.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-mutation")

const message = "Avoid mutating first-party data."

const hint =
  "Match the fix to the scale of the state. Local data: derive a new value — " +
  "Array.replace or Array.modify for elements, Struct.evolve for record fields, a " +
  "fresh const for rebindings. Shared, long-lived state (module-scope bindings, " +
  "closure-captured cells, subscriber registries): do not patch the assignment — move " +
  "the state into the Effect runtime, holding it in a Ref (SynchronizedRef under " +
  "contention, PubSub for subscriber sets); when a whole file manages state this way, " +
  "invert the module into Effect behind a Layer with one runtime entry at the " +
  "boundary. Never mutate built-ins (prototypes, globals). Mutating a third-party " +
  "structure whose API contract requires assignment (process.exitCode, a WebSocket " +
  "handler slot, a React ref cell) is permitted."

const expectedSignal = (
  name: string,
  line: number,
  column: number
): ExpectedDetection => ({
  name,
  fileName: "src/cases.ts",
  line,
  column,
  message,
  hint
})

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  expectedSignal("property assignment", 14, 1),
  expectedSignal("compound property assignment", 15, 1),
  expectedSignal("element assignment", 16, 1),
  expectedSignal("nested element assignment", 17, 1),
  expectedSignal("postfix increment", 18, 1),
  expectedSignal("prefix decrement", 19, 3),
  expectedSignal("delete property", 20, 8),
  expectedSignal("logical assignment", 21, 1),
  expectedSignal("rebinding a project-declared let", 25, 1),
  expectedSignal("rebinding a parameter", 28, 63),
  expectedSignal("mutating a built-in prototype", 31, 1)
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "Array.replace derives a new array",
    fileName: "src/allowed.ts",
    line: 8,
    column: 23
  },
  {
    name: "Array.modify derives a new array",
    fileName: "src/allowed.ts",
    line: 12,
    column: 24
  },
  {
    name: "comparison operator is not an assignment",
    fileName: "src/allowed.ts",
    line: 15,
    column: 23
  },
  {
    name: "arithmetic operator is not an assignment",
    fileName: "src/allowed.ts",
    line: 17,
    column: 22
  },
  {
    name: "logical not does not write to its operand",
    fileName: "src/allowed.ts",
    line: 20,
    column: 25
  },
  {
    name: "unary minus does not write to its operand",
    fileName: "src/allowed.ts",
    line: 22,
    column: 26
  },
  {
    name: "host-environment handler slot mutation is exempt",
    fileName: "src/allowed.ts",
    line: 27,
    column: 1
  },
  {
    name: "import-alias third-party mutation is exempt",
    fileName: "src/allowed.ts",
    line: 30,
    column: 56
  },
  {
    name: "third-party value in a first-party binding is exempt",
    fileName: "src/allowed.ts",
    line: 36,
    column: 43
  }
]

const runNoMutationFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(noMutation)(project))
    )
  )

  return projectElements.flat()
}

test("no-mutation reports disallowed and permits allowed fixture items", async () => {
  const signals = await runNoMutationFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})

test("no-mutation classifies each signal with a mutation target", async () => {
  const signals = await runNoMutationFixture()
  const targetsByLine = new Map(
    signals
      .filter((signal) => signal.location.path === "src/cases.ts")
      .map((signal) => [
        signal.location.line,
        (signal.data as { readonly target?: string } | undefined)?.target
      ])
  )

  assert.equal(targetsByLine.get(14), "shared-state")
  assert.equal(targetsByLine.get(16), "shared-state")
  assert.equal(targetsByLine.get(20), "shared-state")
  assert.equal(targetsByLine.get(25), "shared-state")
  assert.equal(targetsByLine.get(28), "local")
  assert.equal(targetsByLine.get(31), "builtin")
})
