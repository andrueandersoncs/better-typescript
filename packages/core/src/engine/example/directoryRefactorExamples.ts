import { Schema } from "effect"

// DirectoryRefactorExamples names a fixture root because filesystem loading stays effectful.
export const DirectoryRefactorExamples = Schema.TaggedStruct("directory", {
  root: Schema.String
})

export interface DirectoryRefactorExamples extends Schema.Schema.Type<
  typeof DirectoryRefactorExamples
> {}
