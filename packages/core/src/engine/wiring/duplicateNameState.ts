import { Data, HashSet } from "effect"

// DuplicateNameState keeps seen, collisions, and names because validators share that state.
export class DuplicateNameState extends Data.Class<{
  readonly seen: HashSet.HashSet<string>
  readonly collisions: HashSet.HashSet<string>
  readonly names: ReadonlyArray<string>
}> {}
