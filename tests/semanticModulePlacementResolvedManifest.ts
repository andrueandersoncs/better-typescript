import type { SemanticModuleFixtureManifest } from "./semanticModuleFixtureManifest.js"
import { resolveSemanticModuleFixtureManifest } from "./resolveSemanticModuleFixtureManifest.js"
import { snapshotForFixture } from "./semanticModulePlacementSnapshotForFixture.js"

export const resolvedManifest = async (name: string, manifest: SemanticModuleFixtureManifest) => {
  const snapshot = await snapshotForFixture(name)

  return {
    snapshot,
    resolved: resolveSemanticModuleFixtureManifest(manifest, snapshot)
  }
}
