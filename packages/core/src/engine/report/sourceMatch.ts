import { Schema } from "effect"
import { TsSourceFile } from "@better-typescript/matchers/tsSourceFile"

const booleanArraySchema = Schema.Array(Schema.Boolean)

// SourceMatch carries one file's wiring decisions because later collection needs both together.
export const SourceMatch = Schema.Struct({
  sourceFile: TsSourceFile,
  candidatePath: Schema.String,
  matches: booleanArraySchema
})

export interface SourceMatch extends Schema.Schema.Type<typeof SourceMatch> {}
