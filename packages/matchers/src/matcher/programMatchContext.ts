import { TsSourceFile } from "../tsSourceFile.js"
import { ProgramContext } from "../sources/data.js"
import { Schema } from "effect"

// programSourceFilesSchema lists program files because plans read one snapshot.
export const programSourceFilesSchema = Schema.Array(TsSourceFile)

// ProgramMatchContext is separate because MatchContext expresses only one source file.
export const ProgramMatchContext = Schema.Struct({
  ...ProgramContext.fields,
  sourceFiles: programSourceFilesSchema
})

export interface ProgramMatchContext extends Schema.Schema.Type<typeof ProgramMatchContext> {}
