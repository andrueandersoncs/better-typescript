import { Array, Schema } from "effect"

// ExampleSnippet is the shared filePath/code pair because owners need one vocabulary.
export class ExampleSnippet extends Schema.Class<ExampleSnippet>("ExampleSnippet")({
  filePath: Schema.String,
  code: Schema.String
}) {}

const exampleSnippetArray = Schema.NonEmptyArray(ExampleSnippet)

// RefactorExample is the shared bad/good pair because loaders need one vocabulary.
export class RefactorExample extends Schema.Class<RefactorExample>("RefactorExample")({
  bad: exampleSnippetArray,
  good: exampleSnippetArray
}) {}

// NonEmptyExampleTree is a non-empty snippet tree because readers need one vocabulary.
export type NonEmptyExampleTree = Array.NonEmptyReadonlyArray<ExampleSnippet>

const refactorExampleArray = Schema.Array(RefactorExample)

// InlineRefactorExamples keeps already-built snippets because construction must stay inert.
export class InlineRefactorExamples extends Schema.TaggedClass<InlineRefactorExamples>()("inline", {
  examples: refactorExampleArray
}) {}

// DirectoryRefactorExamples names a fixture root because filesystem loading stays effectful.
export class DirectoryRefactorExamples extends Schema.TaggedClass<DirectoryRefactorExamples>()(
  "directory",
  {
    root: Schema.String
  }
) {}

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
