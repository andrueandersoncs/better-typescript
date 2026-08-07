import { Schema } from "effect"
import { TsSourceFile } from "@better-typescript/matchers/tsSourceFile"

const booleanArraySchema = Schema.Array(Schema.Boolean)

// SourceMatch pairs a SourceFile with wiring matches because collection is cross-entry.
export const SourceMatch = Schema.Struct({
  sourceFile: TsSourceFile,
  candidatePath: Schema.String,
  matches: booleanArraySchema
})

export interface SourceMatch extends Schema.Schema.Type<typeof SourceMatch> {}
