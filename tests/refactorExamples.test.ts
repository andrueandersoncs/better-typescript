import * as assert from "node:assert/strict"
import * as fs from "node:fs"
import * as path from "node:path"
import { test } from "node:test"
import { Effect, Array } from "effect"
import {
  packageExamplePairRoots,
  packageExampleRoot,
  packageExamplesRoot
} from "./packageExamples.js"
import { defaultWiring } from "@better-typescript/checks/preset/defaultWiring"
import type { NamedCheck } from "@better-typescript/core/engine/wiring/data"
import { runCheckOnProject, loadProject } from "@better-typescript/core/project/loadProject"

const runSide = async (check: (typeof defaultWiring.checks)[number]["check"], sideRoot: string) => {
  const workspace = await Effect.runPromise(loadProject(sideRoot))
  const nested = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(Array.of(check))(project))
    )
  )

  return nested.flat()
}

test("reported checks load fixture example trees with at least one pair", () => {
  const reported = defaultWiring.checks.filter((check: NamedCheck) => check.reported)

  for (const named of reported) {
    assert.ok(named.examples().length > 0, `${named.name} should declare refactor examples`)

    const exampleRoot = packageExampleRoot(named.name)
    assert.ok(fs.existsSync(exampleRoot), `${named.name} should have ${exampleRoot}`)
    assert.ok(
      packageExamplePairRoots(named.name).length > 0,
      `${named.name} should have <id>/{bad,good}`
    )
  }
})

test("fixture refactor examples: bad trees detect and good trees stay clean", async () => {
  const withExamples = defaultWiring.checks.filter(
    (check: NamedCheck) => check.examples().length > 0
  )
  const failures: Array<string> = []

  for (const named of withExamples) {
    for (const pairRoot of packageExamplePairRoots(named.name)) {
      const pairName = path.basename(pairRoot)
      const badDetections = await runSide(named.check, path.join(pairRoot, "bad"))
      const goodDetections = await runSide(named.check, path.join(pairRoot, "good"))

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
        failures.push(`${named.name} example/${pairName}/good should stay clean, got ${details}`)
      }
    }
  }

  assert.deepEqual(failures, [])
  assert.ok(
    fs.existsSync(packageExamplesRoot),
    `package examples root should exist at ${packageExamplesRoot}`
  )
})
