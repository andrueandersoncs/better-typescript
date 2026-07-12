import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { type NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"
import { loadRefactorExamplesAt } from "@better-typescript/core/engine/example"

const moduleUrlPath = fileURLToPath(import.meta.url)
const moduleDirectory = path.dirname(moduleUrlPath)
const repoRoot = path.resolve(moduleDirectory, "../../..")

export const fixturesRoot = path.join(repoRoot, "tests", "fixtures")

export const fixtureExampleRoot = (fixtureId: string): string =>
  path.join(fixturesRoot, fixtureId, "example")

export const fixtureRefactorExamples = (
  fixtureId: string
): NonEmptyRefactorExamples => {
  const exampleRoot = fixtureExampleRoot(fixtureId)
  const loadExamples = loadRefactorExamplesAt(exampleRoot)

  return Effect.runSync(loadExamples)
}
