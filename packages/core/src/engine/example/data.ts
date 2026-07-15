import { Array, Schema } from "effect"

/**
 * ExampleSnippet is the shared filePath, code contract used by
 * exampleSnippetArray, refactorExample, and NonEmptyExampleTree.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
export class ExampleSnippet extends Schema.Class<ExampleSnippet>("ExampleSnippet")({
  filePath: Schema.String,
  code: Schema.String
}) {}

const exampleSnippetArray = Schema.NonEmptyArray(ExampleSnippet)

/**
 * RefactorExample is the shared bad, good contract used by Signal,
 * refactorExample, and loadRefactorExamplesAt.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
export class RefactorExample extends Schema.Class<RefactorExample>("RefactorExample")({
  bad: exampleSnippetArray,
  good: exampleSnippetArray
}) {}

/**
 * NonEmptyExampleTree is the shared 0, length contract used by readExampleTree
 * and refactorExampleTrees.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
export type NonEmptyExampleTree = Array.NonEmptyReadonlyArray<ExampleSnippet>

/**
 * NonEmptyRefactorExamples is the shared 0, length contract used by
 * loadRefactorExamplesAt and namedCheck.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
export type NonEmptyRefactorExamples = Array.NonEmptyReadonlyArray<RefactorExample>

/**
 * ExampleLoadError is the shared message, name, stack, cause contract used by
 * collectTypeScriptFiles, loadRefactorExamplesAt, and readExampleTree.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
export class ExampleLoadError extends Schema.TaggedErrorClass<ExampleLoadError>()(
  "ExampleLoadError",
  {
    message: Schema.String
  }
) {}
