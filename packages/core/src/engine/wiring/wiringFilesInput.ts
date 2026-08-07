import { Array, Data } from "effect"

// WiringFilesInput is the authoring files half because defineConfig validates globs once.
export class WiringFilesInput extends Data.Class<{
  readonly files: Array.NonEmptyReadonlyArray<string>
}> {}
