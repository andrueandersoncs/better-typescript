import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { noDuplicateFunctionNames } from "@better-typescript/checks/noDuplicateFunctionNames"
import type { Detection } from "@better-typescript/core/engine/location"
import { runCheckOnProject } from "@better-typescript/core/engine/report"
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
  "no-duplicate-function-names"
)

const messageFor = (functionName: string): string =>
  `Avoid declaring the top-level function ${functionName} with an identical signature in multiple files.`

const hintFor = (functionName: string, otherFiles: string): string =>
  `${functionName} is declared with the same signature in ${otherFiles}, which makes ` +
  "the copies semantic duplicates. Extract one shared implementation into a module " +
  "scoped to its domain and import it from every file that uses it. Name the module " +
  "after the concept it serves (ts.Node helpers belong in ts-node.ts), not a generic " +
  "lib.ts or utils.ts. Same-name functions over different signatures (user.ts#make, " +
  "account.ts#make) are module vocabulary, not duplicates."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "alpha.sharedDeclaration",
    fileName: "src/alpha.ts",
    line: 3,
    column: 10,
    message: messageFor("sharedDeclaration"),
    hint: hintFor("sharedDeclaration", "src/beta.ts")
  },
  {
    name: "alpha.sharedArrow",
    fileName: "src/alpha.ts",
    line: 5,
    column: 7,
    message: messageFor("sharedArrow"),
    hint: hintFor("sharedArrow", "src/beta.ts")
  },
  {
    name: "alpha.sharedExpression",
    fileName: "src/alpha.ts",
    line: 7,
    column: 7,
    message: messageFor("sharedExpression"),
    hint: hintFor("sharedExpression", "src/gamma.ts")
  },
  {
    name: "alpha.crowded",
    fileName: "src/alpha.ts",
    line: 9,
    column: 7,
    message: messageFor("crowded"),
    hint: hintFor(
      "crowded",
      "src/beta.ts, src/gamma.ts, src/delta.ts and 1 more file"
    )
  },
  {
    name: "beta.sharedDeclaration",
    fileName: "src/beta.ts",
    line: 3,
    column: 10,
    message: messageFor("sharedDeclaration"),
    hint: hintFor("sharedDeclaration", "src/alpha.ts")
  },
  {
    name: "beta.sharedArrow",
    fileName: "src/beta.ts",
    line: 5,
    column: 7,
    message: messageFor("sharedArrow"),
    hint: hintFor("sharedArrow", "src/alpha.ts")
  },
  {
    name: "beta.crowded",
    fileName: "src/beta.ts",
    line: 7,
    column: 7,
    message: messageFor("crowded"),
    hint: hintFor(
      "crowded",
      "src/alpha.ts, src/gamma.ts, src/delta.ts and 1 more file"
    )
  },
  {
    name: "gamma.sharedExpression",
    fileName: "src/gamma.ts",
    line: 3,
    column: 7,
    message: messageFor("sharedExpression"),
    hint: hintFor("sharedExpression", "src/alpha.ts")
  },
  {
    name: "gamma.crowded",
    fileName: "src/gamma.ts",
    line: 5,
    column: 7,
    message: messageFor("crowded"),
    hint: hintFor(
      "crowded",
      "src/alpha.ts, src/beta.ts, src/delta.ts and 1 more file"
    )
  },
  {
    name: "delta.crowded",
    fileName: "src/delta.ts",
    line: 3,
    column: 10,
    message: messageFor("crowded"),
    hint: hintFor(
      "crowded",
      "src/alpha.ts, src/beta.ts, src/gamma.ts and 1 more file"
    )
  },
  {
    name: "epsilon.crowded",
    fileName: "src/epsilon.ts",
    line: 3,
    column: 7,
    message: messageFor("crowded"),
    hint: hintFor(
      "crowded",
      "src/alpha.ts, src/beta.ts, src/gamma.ts and 1 more file"
    )
  },
  {
    name: "vocabularyAccount.slugify",
    fileName: "src/vocabulary-account.ts",
    line: 11,
    column: 14,
    message: messageFor("slugify"),
    hint: hintFor("slugify", "src/vocabulary-user.ts")
  },
  {
    name: "vocabularyUser.slugify",
    fileName: "src/vocabulary-user.ts",
    line: 11,
    column: 14,
    message: messageFor("slugify"),
    hint: hintFor("slugify", "src/vocabulary-account.ts")
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "vocabularyUser.make.differentSignature",
    fileName: "src/vocabulary-user.ts",
    line: 8,
    column: 14
  },
  {
    name: "vocabularyAccount.make.differentSignature",
    fileName: "src/vocabulary-account.ts",
    line: 8,
    column: 14
  },
  {
    name: "vocabularyUser.describe.differentArity",
    fileName: "src/vocabulary-user.ts",
    line: 14,
    column: 14
  },
  {
    name: "vocabularyAccount.describe.differentArity",
    fileName: "src/vocabulary-account.ts",
    line: 14,
    column: 14
  },
  {
    name: "alpha.localOverload.stringSignature",
    fileName: "src/allowed-alpha.ts",
    line: 3,
    column: 10
  },
  {
    name: "alpha.localOverload.numberSignature",
    fileName: "src/allowed-alpha.ts",
    line: 4,
    column: 10
  },
  {
    name: "alpha.localOverload.implementation",
    fileName: "src/allowed-alpha.ts",
    line: 5,
    column: 10
  },
  {
    name: "alpha.containsNested",
    fileName: "src/allowed-alpha.ts",
    line: 9,
    column: 10
  },
  {
    name: "alpha.containsNested.sharedDeclaration",
    fileName: "src/allowed-alpha.ts",
    line: 10,
    column: 12
  },
  {
    name: "AlphaService.sharedArrow",
    fileName: "src/allowed-alpha.ts",
    line: 15,
    column: 3
  },
  {
    name: "objectLiteral.sharedExpression",
    fileName: "src/allowed-alpha.ts",
    line: 19,
    column: 3
  },
  {
    name: "alpha.valueOnly",
    fileName: "src/allowed-alpha.ts",
    line: 22,
    column: 10
  },
  {
    name: "beta.betaOnly",
    fileName: "src/allowed-beta.ts",
    line: 3,
    column: 7
  },
  {
    name: "beta.valueOnly",
    fileName: "src/allowed-beta.ts",
    line: 5,
    column: 7
  }
]

const runNoDuplicateFunctionNamesFixture = async (): Promise<
  ReadonlyArray<Detection>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(noDuplicateFunctionNames)(project))
    )
  )

  return projectElements.flat()
}

test("no-duplicate-function-names reports disallowed and permits allowed fixture items", async () => {
  const signals = await runNoDuplicateFunctionNamesFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems, { sort: true })
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
