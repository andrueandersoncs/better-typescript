import * as assert from "node:assert/strict"
import { Effect } from "effect"
import { type Policy } from "@better-typescript/core/engine/policy/policyClass"
import { type Detection } from "@better-typescript/core/engine/location/detectionData"
import { toPolicies } from "@better-typescript/core/engine/policy/locateTarget"
import { makeContext } from "@better-typescript/matchers/sources/makeContext"
import { loadProject } from "@better-typescript/core/project/loadProject"

export const includeEverySourceFile = (): boolean => true

export const runPoliciesOnFixture = async (
  fixturePath: string,
  policies: ReadonlyArray<Policy>
): Promise<ReadonlyArray<ReadonlyArray<Detection>>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const project = workspace.projects[0]

  assert.ok(project !== undefined)

  const context = makeContext(project.rootPath)(project.program)
  return toPolicies(policies)(includeEverySourceFile)(context)
}
