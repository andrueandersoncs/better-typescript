import { Array, Data, HashSet, Schema } from "effect"
import { Policy, WorkspacePolicy } from "../policy/data.js"
import type { Advice } from "../derive/data.js"
import type { Signal } from "../signal/data.js"

// WiringPolicy is the ordered policy union because one fleet can mix program and workspace stages.
export type WiringPolicy = Policy | WorkspacePolicy

// Wiring pairs policies with advice derivation because both halves travel together.
export class Wiring extends Data.Class<{
  readonly policies: ReadonlyArray<WiringPolicy>
  readonly derive: (signals: ReadonlyArray<Signal>) => ReadonlyArray<Advice>
}> {}

// WiringEntry pairs a file scope with its wiring because both sides share that.
export class WiringEntry extends Data.Class<{
  readonly files: Array.NonEmptyReadonlyArray<string>
  readonly wiring: Wiring
}> {}

// WiringConfig is the ordered entry boundary because loading preserves order.
export type WiringConfig = ReadonlyArray<WiringEntry>

// WiringFilesInput is the authoring files half because defineConfig validates globs once.
export class WiringFilesInput extends Data.Class<{
  readonly files: Array.NonEmptyReadonlyArray<string>
}> {}

// WiringEntryInput is the authoring entry bag because defineConfig owns construction.
export class WiringEntryInput extends Data.Class<{
  readonly files: Array.NonEmptyReadonlyArray<string>
  readonly wiring: Pick<Wiring, "policies" | "derive">
}> {}

const duplicateNameArray = Schema.Array(Schema.String)

// DuplicatePolicyNamesError carries structured collision names because CLI handling needs them.
export class DuplicatePolicyNamesError extends Schema.TaggedErrorClass<DuplicatePolicyNamesError>()(
  "DuplicatePolicyNamesError",
  {
    names: duplicateNameArray
  }
) {
  get message(): string {
    return `Duplicate policy names: ${Array.join(this.names, ", ")}`
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

const policyInstanceSchema = Schema.instanceOf(Policy)
const workspacePolicyInstanceSchema = Schema.instanceOf(WorkspacePolicy)

// ProgramPolicySlot indexes a program Policy in wiring because collection is cross-entry.
export const ProgramPolicySlot = Schema.Struct({
  wiringIndex: Schema.Number,
  policyIndex: Schema.Number,
  policy: policyInstanceSchema
})

export interface ProgramPolicySlot extends Schema.Schema.Type<typeof ProgramPolicySlot> {}

export const isProgramPolicy = Schema.is(policyInstanceSchema)
export const isWorkspacePolicy = Schema.is(workspacePolicyInstanceSchema)
