import * as assert from "node:assert/strict"
import { test } from "bun:test"
import { Array, Effect } from "effect"
import { toPolicies } from "@better-typescript/core/engine/policy/locateTarget"
import { makeContext } from "@better-typescript/matchers/sources/makeContext"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { isUndefinedIdentifierFact } from "./isUndefinedIdentifierFact.js"
import { fixturePath } from "./policyTestFixturePath.js"
import { undefinedPolicy } from "./undefinedIdentifierPolicy.js"

test("policy guidance renders matcher facts without prose in the matcher", async () => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const project = workspace.projects[0]

  assert.notEqual(project, undefined)

  if (project === undefined) {
    return
  }

  const context = makeContext(project.rootPath)(project.program)
  const detections = toPolicies(Array.of(undefinedPolicy))(() => true)(context)
  const firstPolicyDetections = detections[0] ?? Array.empty()

  assert.equal(firstPolicyDetections.length > 0, true)
  assert.equal(
    Array.every(
      firstPolicyDetections,
      (detection) => detection.message === "Undefined identifier."
    ),
    true
  )
  assert.equal(
    Array.every(
      firstPolicyDetections,
      (detection) => detection.hint === "Model absence explicitly with Option."
    ),
    true
  )
  assert.equal(
    Array.every(firstPolicyDetections, (detection) => isUndefinedIdentifierFact(detection.data)),
    true
  )
})
