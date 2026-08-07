import { Data } from "effect"
import { Detection } from "@better-typescript/core/engine/location/detectionData"

// Five complete detection arrays because advisers consume one finished batch.
export class ImperativeStateManagerInput extends Data.Class<{
  readonly noMutation: ReadonlyArray<Detection>
  readonly preferHashMap: ReadonlyArray<Detection>
  readonly preferHashSet: ReadonlyArray<Detection>
  readonly noMutableArrayMethods: ReadonlyArray<Detection>
  readonly noMutableVariableDeclarations: ReadonlyArray<Detection>
}> {}
