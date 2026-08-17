import { Array, Option } from "effect"
import { fixtureSnapshotAt } from "./semanticModulesFixtureSnapshotAt.js"

export const semanticModulesEntityKeyNamed =
  (displayName: string) => (snapshot: Awaited<ReturnType<typeof fixtureSnapshotAt>>) =>
    Option.getOrThrow(
      Array.findFirst(snapshot.entities, (entity) => entity.displayName === displayName)
    ).key
