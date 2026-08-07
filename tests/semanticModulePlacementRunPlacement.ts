import * as assert from "node:assert/strict"
import { Array, Effect } from "effect"
import { type Detection } from "@better-typescript/core/engine/location/detectionData"
import { toPolicies } from "@better-typescript/core/engine/policy/locateTarget"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { makeContext } from "@better-typescript/matchers/sources/makeContext"
import { fixturePath } from "./semanticModulePlacementFixturePath.js"
import { includeEverySourceFile } from "./semanticModulePlacementIncludeEverySourceFile.js"
import { placementPolicy } from "./semanticModulePlacementPolicy.js"

export const runPlacement = async (name: string): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath(name)))
  const project = workspace.projects[0]

  assert.ok(project !== undefined)

  const context = makeContext(project.rootPath)(project.program)
  const detectionsByPolicy = toPolicies(Array.of(placementPolicy))(includeEverySourceFile)(context)

  return detectionsByPolicy[0] ?? Array.empty()
}
