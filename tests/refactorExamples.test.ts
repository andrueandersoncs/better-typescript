import * as assert from "node:assert/strict"
import * as fs from "node:fs"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import {
  fixtureExampleRoot,
  fixturesRoot
} from "@better-typescript/checks/fixtureExamples"
import { runCheckOnProject } from "@better-typescript/core/engine/report"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { defaultWiring } from "@better-typescript/checks/preset/defaultWiring"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))

const pairRoots = (exampleRoot: string): ReadonlyArray<string> =>
  fs
    .readdirSync(exampleRoot, { withFileTypes: true })
    .flatMap((entry) => {
      if (!entry.isDirectory()) {
        return []
      }

      const pairRoot = path.join(exampleRoot, entry.name)
      const badRoot = path.join(pairRoot, "bad")
      const goodRoot = path.join(pairRoot, "good")
      const complete =
        fs.existsSync(badRoot) &&
        fs.statSync(badRoot).isDirectory() &&
        fs.existsSync(goodRoot) &&
        fs.statSync(goodRoot).isDirectory()

      return complete ? [pairRoot] : []
    })
    .slice()
    .sort((left, right) =>
      path.basename(left).localeCompare(path.basename(right), undefined, {
        numeric: true
      })
    )

const runSide = async (
  check: (typeof defaultWiring.checks)[number]["check"],
  sideRoot: string
) => {
  const workspace = await Effect.runPromise(loadProject(sideRoot))
  const nested = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(check)(project))
    )
  )

  return nested.flat()
}

test("reported checks load fixture example trees with at least one pair", () => {
  const reported = defaultWiring.checks.filter((check) => check.reported)

  for (const named of reported) {
    assert.ok(
      named.examples.length > 0,
      `${named.name} should declare refactor examples`
    )

    const exampleRoot = fixtureExampleRoot(named.name)
    assert.ok(
      fs.existsSync(exampleRoot),
      `${named.name} should have ${path.relative(testDirectory, exampleRoot)}`
    )
    assert.ok(
      pairRoots(exampleRoot).length > 0,
      `${named.name} should have example/<id>/{bad,good}`
    )
  }
})

test("fixture refactor examples: bad trees detect and good trees stay clean", async () => {
  const withExamples = defaultWiring.checks.filter(
    (check) => check.examples.length > 0
  )
  const failures: Array<string> = []

  for (const named of withExamples) {
    const exampleRoot = fixtureExampleRoot(named.name)

    for (const pairRoot of pairRoots(exampleRoot)) {
      const pairName = path.basename(pairRoot)
      const badDetections = await runSide(
        named.check,
        path.join(pairRoot, "bad")
      )
      const goodDetections = await runSide(
        named.check,
        path.join(pairRoot, "good")
      )

      if (badDetections.length === 0) {
        failures.push(`${named.name} example/${pairName}/bad should detect`)
      }

      if (goodDetections.length > 0) {
        const details = goodDetections
          .map(
            (element) =>
              `${element.location.path}:${element.location.line}:${element.location.column} ${element.message}`
          )
          .join("; ")
        failures.push(
          `${named.name} example/${pairName}/good should stay clean, got ${details}`
        )
      }
    }
  }

  assert.deepEqual(failures, [])
  assert.ok(
    fs.existsSync(fixturesRoot),
    `fixtures root should exist at ${fixturesRoot}`
  )
})
