import type { SemanticModuleFixtureEntity } from "./semanticModuleFixtureEntity.js"

export interface SemanticModuleFixtureManifest {
  readonly entities: ReadonlyArray<SemanticModuleFixtureEntity>
  readonly modules: ReadonlyArray<ReadonlyArray<string>>
}
