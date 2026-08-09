import * as assert from "node:assert/strict"
import { Array, Effect, Schema } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { semanticModulePlacement } from "@better-typescript/guidance/preset/semanticModulePlacementPolicies"
import { semanticModuleEngine } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleEngine"
import { emptySemanticModuleHardBondRuleCatalog } from "@better-typescript/matchers/builtins/architectureExplore/emptySemanticModuleHardBondRuleCatalog"
import type { SemanticModuleEntityRecord } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleEntityRecordSchema"
import type { SemanticModuleHardBondRule } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleHardBondRule"
import type { SemanticModuleHardBondRuleCatalog } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleHardBondRuleCatalog"
import { ProgramMatchContext } from "@better-typescript/matchers/matcher/programMatchContext"
import { isProjectSourceFile } from "@better-typescript/matchers/sources/isProjectSourceFile"
import { makeContext } from "@better-typescript/matchers/sources/makeContext"
import { fixturePath } from "./semanticModulePlacementReportFixturePath.js"

const entityByName =
  (entities: ReadonlyArray<SemanticModuleEntityRecord>) => (displayName: string) => {
    const matches = Array.filter(entities, (entity) => entity.displayName === displayName)

    assert.equal(matches.length, 1, `expected one entity named ${displayName}`)

    return matches[0]!
  }

const ordersCatalog = (
  entities: ReadonlyArray<SemanticModuleEntityRecord>
): SemanticModuleHardBondRuleCatalog => {
  const byName = entityByName(entities)
  const parseOrder = byName("parseOrder").key
  const formatOrderError = byName("formatOrderError").key
  const orderParseError = byName("OrderParseError").key

  const rule: SemanticModuleHardBondRule = {
    id: "orders-test-hard-bond",
    evidenceSchema: Schema.Struct({
      _tag: Schema.Literal("test-hard-bond")
    }),
    candidates: () =>
      Array.make(
        {
          left: parseOrder,
          right: formatOrderError,
          evidenceKey: "parseOrder-formatOrderError",
          evidence: { _tag: "test-hard-bond" }
        },
        {
          left: formatOrderError,
          right: orderParseError,
          evidenceKey: "formatOrderError-OrderParseError",
          evidence: { _tag: "test-hard-bond" }
        }
      )
  }

  return Object.freeze(Array.of(rule))
}

export const loadFixture = async () => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const [project] = workspace.projects

  assert.ok(project, "expected semantic-module-placement fixture to load one project")

  const context = makeContext(project.rootPath)(project.program)
  const sourceFiles = Array.filter(project.program.getSourceFiles(), isProjectSourceFile)
  const planningContext = ProgramMatchContext.make({ ...context, sourceFiles })
  const snapshot = semanticModuleEngine.buildSemanticModuleSnapshot(
    planningContext,
    emptySemanticModuleHardBondRuleCatalog
  )
  const catalog = ordersCatalog(snapshot.entities)
  const policy = semanticModulePlacement(catalog)

  return { workspace, project, policy, catalog }
}
