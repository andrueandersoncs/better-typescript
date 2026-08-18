import * as assert from "node:assert/strict"
import * as fs from "node:fs"
import * as path from "node:path"
import { test } from "bun:test"
import { Array, Effect } from "effect"
import { packageExamplePairRoots } from "./packageExamplePairRoots.js"
import { packageExampleRoot } from "./packageExampleRoot.js"
import { packageExamplesRoot } from "./packageExamplesRoot.js"
import { defaultWiring } from "@better-typescript/guidance/preset/defaultWiring"
import { type Policy } from "@better-typescript/core/engine/policy/policyClass"
import { runPolicyOnProject } from "@better-typescript/core/project/loadProject/runPolicyOnProject"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { isProgramPolicy } from "@better-typescript/core/engine/wiring/isProgramPolicy"

const runSide = async (policy: Policy, sideRoot: string) => {
  const workspace = await Effect.runPromise(loadProject(sideRoot))
  const nested = await Promise.all(
    workspace.projects.map((project) => Effect.runPromise(runPolicyOnProject(policy)(project)))
  )

  return nested.flat()
}

test("reported checks declare fixture example trees with at least one pair", () => {
  const reported = defaultWiring.policies
    .filter(isProgramPolicy)
    .filter((policy) => policy.reported)
  for (const named of reported) {
    assert.equal(named.examples._tag, "directory", `${named.name} should declare examples`)

    const exampleRoot = packageExampleRoot(named.name)
    assert.ok(fs.existsSync(exampleRoot), `${named.name} should have ${exampleRoot}`)
    assert.ok(
      packageExamplePairRoots(named.name).length > 0,
      `${named.name} should have <id>/{bad,good}`
    )
  }
})

test("fixture refactor examples: bad trees detect and good trees stay clean", async () => {
  const withExamples: Array<Policy> = defaultWiring.policies
    .filter(isProgramPolicy)
    .filter((policy) => packageExamplePairRoots(policy.name).length > 0)

  const failures: Array<string> = []

  for (const named of withExamples) {
    for (const pairRoot of packageExamplePairRoots(named.name)) {
      const pairName = path.basename(pairRoot)
      const badDetections = await runSide(named, path.join(pairRoot, "bad"))
      const goodDetections = await runSide(named, path.join(pairRoot, "good"))

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
