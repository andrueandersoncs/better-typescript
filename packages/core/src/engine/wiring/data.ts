import { Array, Data, HashSet, Schema, Stream } from "effect"
import type { Check } from "../check/data.js"
import type { Advice } from "../derive/data.js"
import type { RefactorExample } from "../example/data.js"
import type { Signal } from "../signal/data.js"

// NamedCheck binds name and policy to its check because consumers share identity.
export class NamedCheck extends Data.Class<{
  readonly name: string
  readonly check: Check
  readonly reported: boolean
  readonly examples: ReadonlyArray<RefactorExample>
}> {}

// Wiring is the check set plus advice derivation for one scope because both halves travel together.
export class Wiring<E = never> extends Data.Class<{
  readonly checks: ReadonlyArray<NamedCheck>
  readonly derive: (signals: ReadonlyArray<Signal>) => Stream.Stream<Advice, E>
}> {}

// WiringEntry pairs a file scope with its wiring because both sides share that.
export class WiringEntry<E = never> extends Data.Class<{
  readonly files: Array.NonEmptyReadonlyArray<string>
  readonly wiring: Wiring<E>
}> {}

// WiringConfig is the ordered entry boundary because loading preserves order.
export type WiringConfig<E = never> = ReadonlyArray<WiringEntry<E>>

const duplicateNameArray = Schema.Array(Schema.String)

// DuplicateCheckNamesError carries structured collision names because CLI handling needs them.
export class DuplicateCheckNamesError extends Schema.TaggedErrorClass<DuplicateCheckNamesError>()(
  "DuplicateCheckNamesError",
  {
    names: duplicateNameArray
  }
) {
  get message(): string {
    return `Duplicate check names: ${Array.join(this.names, ", ")}`
  }
}

const invalidWiringIndexArray = Schema.Array(Schema.Number)

// InvalidWiringFilesError carries invalid entry indexes because validation must stay structured.
export class InvalidWiringFilesError extends Schema.TaggedErrorClass<InvalidWiringFilesError>()(
  "InvalidWiringFilesError",
  {
    indexes: invalidWiringIndexArray
  }
) {
  get message(): string {
    const indexes = Array.map(this.indexes, String)

    return `Wiring files must be non-empty glob arrays at indexes: ${Array.join(indexes, ", ")}`
  }
}

// DuplicateNameState keeps seen, collisions, and names because validators share that state.
export class DuplicateNameState extends Data.Class<{
  readonly seen: HashSet.HashSet<string>
  readonly collisions: HashSet.HashSet<string>
  readonly names: ReadonlyArray<string>
}> {}
