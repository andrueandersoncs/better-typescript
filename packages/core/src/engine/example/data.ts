import { Array, Schema } from "effect"

// ExampleSnippet is the shared filePath/code pair because owners need one vocabulary.
export const ExampleSnippet = Schema.Struct({
  filePath: Schema.String,
  code: Schema.String
})

export interface ExampleSnippet extends Schema.Schema.Type<typeof ExampleSnippet> {}

const exampleSnippetArray = Schema.NonEmptyArray(ExampleSnippet)

// RefactorExample is the shared bad/good pair because loaders need one vocabulary.
export const RefactorExample = Schema.Struct({
  bad: exampleSnippetArray,
  good: exampleSnippetArray
})

export interface RefactorExample extends Schema.Schema.Type<typeof RefactorExample> {}

const refactorExampleArray = Schema.Array(RefactorExample)

// InlineRefactorExamples keeps already-built snippets because construction must stay inert.
export const InlineRefactorExamples = Schema.TaggedStruct("inline", {
  examples: refactorExampleArray
})

export interface InlineRefactorExamples extends Schema.Schema.Type<typeof InlineRefactorExamples> {}

// DirectoryRefactorExamples names a fixture root because filesystem loading stays effectful.
export const DirectoryRefactorExamples = Schema.TaggedStruct("directory", {
  root: Schema.String
})

export interface DirectoryRefactorExamples extends Schema.Schema.Type<
  typeof DirectoryRefactorExamples
> {}

// RefactorExampleSource is the inert example descriptor because owners must not load.
export type RefactorExampleSource = InlineRefactorExamples | DirectoryRefactorExamples

const refactorExampleSourceMembers = Array.make(InlineRefactorExamples, DirectoryRefactorExamples)

// refactorExampleSourceSchema is the runtime codec because report and advice share it.
export const refactorExampleSourceSchema = Schema.Union(refactorExampleSourceMembers)

// ExampleLoadError is the shared load-failure contract because loaders need one vocabulary.
export class ExampleLoadError extends Schema.TaggedErrorClass<ExampleLoadError>()(
  "ExampleLoadError",
  {
    message: Schema.String
  }
) {}
