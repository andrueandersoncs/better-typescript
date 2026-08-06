import * as assert from "node:assert/strict"
import { Array, Option, pipe } from "effect"
import type {
  SemanticModuleEntityKey,
  SemanticModuleSnapshotV1
} from "@better-typescript/matchers/builtins/architectureExplore/semanticModules.js"

type SemanticModuleDeclarationKind = SemanticModuleSnapshotV1["entities"][number]["declarationKind"]

export interface SemanticModuleFixtureSelector {
  readonly path: string
  readonly declarationKind: SemanticModuleDeclarationKind
  readonly displayName: string
  readonly occurrence: number
}

export interface SemanticModuleFixtureEntity {
  readonly label: string
  readonly selector: SemanticModuleFixtureSelector
}

export interface SemanticModuleFixtureManifest {
  readonly entities: ReadonlyArray<SemanticModuleFixtureEntity>
  readonly modules: ReadonlyArray<ReadonlyArray<string>>
}

export interface ResolvedSemanticModuleFixtureEntity {
  readonly label: string
  readonly key: SemanticModuleEntityKey
}

export interface ResolvedSemanticModuleFixtureManifest {
  readonly entities: ReadonlyArray<ResolvedSemanticModuleFixtureEntity>
  readonly modules: ReadonlyArray<ReadonlyArray<SemanticModuleEntityKey>>
}

const matchesSelector =
  (selector: SemanticModuleFixtureSelector) =>
  (entity: SemanticModuleSnapshotV1["entities"][number]) =>
    entity.key.path === selector.path &&
    entity.declarationKind === selector.declarationKind &&
    entity.displayName === selector.displayName

const resolveEntity =
  (snapshot: SemanticModuleSnapshotV1) => (entity: SemanticModuleFixtureEntity) => {
    const matches = Array.filter(snapshot.entities, matchesSelector(entity.selector))
    const selected = Array.get(matches, entity.selector.occurrence - 1)

    assert.equal(
      entity.selector.occurrence > 0,
      true,
      `${entity.label} occurrence must be positive`
    )
    assert.equal(
      Option.isSome(selected),
      true,
      `${entity.label} selector did not resolve exactly once`
    )

    return {
      label: entity.label,
      key: Option.getOrThrow(selected).key
    }
  }

const keyForLabel =
  (entities: ReadonlyArray<ResolvedSemanticModuleFixtureEntity>) => (label: string) => {
    const matches = Array.filter(entities, (entity) => entity.label === label)

    assert.equal(matches.length, 1, `${label} must identify exactly one fixture entity`)

    return pipe(matches, Array.head, Option.getOrThrow).key
  }

export const resolveSemanticModuleFixtureManifest = (
  manifest: SemanticModuleFixtureManifest,
  snapshot: SemanticModuleSnapshotV1
): ResolvedSemanticModuleFixtureManifest => {
  const entities = Array.map(manifest.entities, resolveEntity(snapshot))
  const distinctKeys = new Set(Array.map(entities, (entity) => JSON.stringify(entity.key)))

  assert.equal(distinctKeys.size, entities.length, "fixture selectors must not overlap")
  assert.equal(
    entities.length,
    snapshot.entities.length,
    "every observed entity must have one label"
  )

  const resolveLabel = keyForLabel(entities)
  const modules = Array.map(manifest.modules, (labels) => Array.map(labels, resolveLabel))

  return { entities, modules }
}
