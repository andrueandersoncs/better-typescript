import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noClassMethodImplementations } from "../src/rules/noClassMethodImplementations.js"
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
  "no-class-method-implementations"
)

const message = "Avoid implementing methods on a class."

const hint =
  "A class method that carries a body couples behavior to an object, which is " +
  "object-oriented programming and is not allowed. Extract the logic into a reusable " +
  "exported function that takes the data as a parameter. The only permitted method " +
  "implementation is one that overrides a base-class method (marked with `override`) " +
  "for the purposes of integrating with a third-party library."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "Calculator.add implemented method",
    ruleId: "no-class-method-implementations",
    fileName: "src/cases.ts",
    line: 4,
    column: 3,
    message,
    hint
  },
  {
    name: "Greeter.greet implemented method",
    ruleId: "no-class-method-implementations",
    fileName: "src/cases.ts",
    line: 10,
    column: 3,
    message,
    hint
  },
  {
    name: "Greeter.prefix private implemented method",
    ruleId: "no-class-method-implementations",
    fileName: "src/cases.ts",
    line: 14,
    column: 11,
    message,
    hint
  },
  {
    name: "Counter.zero static implemented method",
    ruleId: "no-class-method-implementations",
    fileName: "src/cases.ts",
    line: 22,
    column: 10,
    message,
    hint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "Animal.speak interface method signature",
    fileName: "src/allowed.ts",
    line: 4,
    column: 3
  },
  {
    name: "Base.render arrow-function property",
    fileName: "src/allowed.ts",
    line: 8,
    column: 12
  },
  {
    name: "Cat.render override arrow-function property",
    fileName: "src/allowed.ts",
    line: 12,
    column: 12
  },
  {
    name: "Box constructor",
    fileName: "src/allowed.ts",
    line: 16,
    column: 3
  },
  {
    name: "Box current getter",
    fileName: "src/allowed.ts",
    line: 18,
    column: 7
  },
  {
    name: "Box read arrow-function property",
    fileName: "src/allowed.ts",
    line: 22,
    column: 12
  }
]

const runNoClassMethodImplementationsFixture = async (): Promise<
  ReadonlyArray<RuleMatch>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) =>
    runRules([noClassMethodImplementations])(project)
  )
}

test("no-class-method-implementations reports disallowed and permits allowed fixture items", async () => {
  const matches = await runNoClassMethodImplementationsFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
