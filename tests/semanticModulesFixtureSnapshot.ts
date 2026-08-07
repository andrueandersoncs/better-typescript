import { fixturePath } from "./semanticModulesFixturePath.js"
import { fixtureSnapshotAt } from "./semanticModulesFixtureSnapshotAt.js"

export const fixtureSnapshot = (reverseSourceFiles = false) =>
  fixtureSnapshotAt(fixturePath, reverseSourceFiles)
