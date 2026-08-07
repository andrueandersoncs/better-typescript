import * as assert from "node:assert/strict"
import { Array, Order, pipe } from "effect"
import type { SemanticModulePlacementModuleSlice } from "@better-typescript/matchers/builtins/architectureExplore/semanticModulePlacementModuleSlice.js"
export const assertSliceShape = (slice: SemanticModulePlacementModuleSlice) => {
  assert.ok(slice.entities.length >= 1)
  assert.equal(
    slice.entities.length,
    new Set(slice.entities.map((entity) => entity.key.path + ":" + entity.key.start)).size
  )
  assert.deepEqual(
    slice.physicalModulePaths,
    pipe(
      slice.entities.map((entity) => entity.key.path),
      Array.dedupe,
      Array.sort(Order.String)
    )
  )

  for (const entity of slice.entities) {
    assert.ok(entity.line >= 1)
    assert.ok(entity.column >= 1)
    assert.ok(typeof entity.displayName === "string")
    assert.ok(typeof entity.declarationKind === "string")
    assert.ok(entity.stratum === "production" || entity.stratum === "test")
  }

  for (const bond of slice.forestBonds) {
    assert.ok(typeof bond.key.ruleId === "string")
    assert.ok(typeof bond.key.evidenceKey === "string")
    assert.ok(bond.evidence !== undefined)
  }
}
