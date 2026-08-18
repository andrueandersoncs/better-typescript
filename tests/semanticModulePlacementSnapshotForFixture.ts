import * as assert from "node:assert/strict"
import { Array, Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { semanticModuleEngine } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleEngine"
import type { SemanticModuleSnapshotV1 } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleEngine"
import { ProgramMatchContext } from "@better-typescript/matchers/matcher/programMatchContext"
import { isProjectSourceFile } from "@better-typescript/matchers/sources/isProjectSourceFile"
import { makeContext } from "@better-typescript/matchers/sources/makeContext"
import { emptyCatalog } from "./semanticModulePlacementEmptyCatalog.js"
import { fixturePath } from "./semanticModulePlacementFixturePath.js"

export const snapshotForFixture = async (name: string): Promise<SemanticModuleSnapshotV1> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath(name)))
  const project = workspace.projects[0]

  assert.ok(project !== undefined)

  const context = makeContext(project.rootPath)(project.program)
  const sourceFiles = Array.filter(project.program.getSourceFiles(), isProjectSourceFile)
  const planningContext = ProgramMatchContext.make({ ...context, sourceFiles })

  return semanticModuleEngine.buildSemanticModuleSnapshot(planningContext, emptyCatalog)
}
