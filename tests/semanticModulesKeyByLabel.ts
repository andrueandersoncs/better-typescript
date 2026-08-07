import { Array, Option } from "effect"
import { resolveSemanticModuleFixtureManifest } from "./resolveSemanticModuleFixtureManifest.js"

export const keyByLabel =
  (resolved: ReturnType<typeof resolveSemanticModuleFixtureManifest>) => (label: string) => {
    const match = Array.findFirst(resolved.entities, (entity) => entity.label === label)

    return Option.getOrThrow(match).key
  }
