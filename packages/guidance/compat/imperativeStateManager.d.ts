import { Schema } from "effect"
import { Detection } from "@better-typescript/core/engine/location/detectionData"
import type { Advice } from "@better-typescript/core/engine/derive/advice"
import type { RefactorExampleSource } from "@better-typescript/core/engine/example/refactorExampleSource"
export declare const ImperativeStateSignals: Schema.Struct<{
  readonly noMutation: Schema.$Array<typeof Detection>
  readonly preferHashMap: Schema.$Array<typeof Detection>
  readonly preferHashSet: Schema.$Array<typeof Detection>
  readonly noMutableArrayMethods: Schema.$Array<typeof Detection>
  readonly noMutableVariableDeclarations: Schema.$Array<typeof Detection>
}>
export interface ImperativeStateSignals extends Schema.Schema.Type<typeof ImperativeStateSignals> {}
export declare const MutationElementData: Schema.Struct<{ readonly target: typeof Schema.String }>
export interface MutationElementData extends Schema.Schema.Type<typeof MutationElementData> {}
export declare const imperativeStateManagerExamples: RefactorExampleSource
export declare const imperativeStateManager: (
  signals: ImperativeStateSignals
) => ReadonlyArray<Advice>
