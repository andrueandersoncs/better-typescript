import { Schema } from "effect"

// ExampleSnippet is the shared filePath/code pair because owners need one vocabulary.
export const ExampleSnippet = Schema.Struct({
  filePath: Schema.String,
  code: Schema.String
})

export interface ExampleSnippet extends Schema.Schema.Type<typeof ExampleSnippet> {}
