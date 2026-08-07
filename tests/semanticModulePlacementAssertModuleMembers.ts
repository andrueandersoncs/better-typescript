import * as assert from "node:assert/strict"
import type { SemanticModulePlacementModuleSlice } from "@better-typescript/matchers/builtins/architectureExplore/semanticModulePlacementModuleSlice.js"
import type { SemanticModuleEntityKey } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleEntityKey"
import { keyEquals } from "./semanticModulePlacementKeyEquals.js"

export const assertModuleMembers = (
  slice: SemanticModulePlacementModuleSlice,
  expected: ReadonlyArray<SemanticModuleEntityKey>
) => {
  assert.equal(slice.entities.length, expected.length)

  for (const [index, key] of expected.entries()) {
    assert.equal(keyEquals(slice.entities[index]!.key, key), true)
  }
}
