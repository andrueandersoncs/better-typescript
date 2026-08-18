import * as assert from "node:assert/strict"
import { Array, Effect } from "effect"
import * as ts from "typescript"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { semanticModuleEngine } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleEngine"
import type { SemanticModuleSnapshotV1 } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleEngine"
import { emptySemanticModuleHardBondRuleCatalog } from "@better-typescript/matchers/builtins/architectureExplore/emptySemanticModuleHardBondRuleCatalog"
import type { SemanticModuleHardBondRuleCatalog } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleHardBondRuleCatalog"
import { ProgramMatchContext } from "@better-typescript/matchers/matcher/programMatchContext"
import { isProjectSourceFile } from "@better-typescript/matchers/sources/isProjectSourceFile"
import { makeContext } from "@better-typescript/matchers/sources/makeContext"

export const fixtureSnapshotAt = async (
  projectPath: string,
  reverseSourceFiles = false,
  includeSourceFile: (sourceFile: ts.SourceFile) => boolean = () => true,
  catalog: SemanticModuleHardBondRuleCatalog = emptySemanticModuleHardBondRuleCatalog
): Promise<SemanticModuleSnapshotV1> => {
  const workspace = await Effect.runPromise(loadProject(projectPath))
  const project = workspace.projects[0]

  assert.ok(project !== undefined)

  const context = makeContext(project.rootPath)(project.program)
  const projectSourceFiles = Array.filter(project.program.getSourceFiles(), isProjectSourceFile)
  const includedSourceFiles = Array.filter(projectSourceFiles, includeSourceFile)
  const sourceFiles = reverseSourceFiles ? Array.reverse(includedSourceFiles) : includedSourceFiles
  const planningContext = ProgramMatchContext.make({ ...context, sourceFiles })

  return semanticModuleEngine.buildSemanticModuleSnapshot(planningContext, catalog)
}
