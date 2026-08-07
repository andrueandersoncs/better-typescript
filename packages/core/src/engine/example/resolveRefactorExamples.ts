import type { Effect } from "effect"
import type { ExampleLoadError } from "./exampleLoadError.js"
import type { RefactorExample } from "./refactorExample.js"
import type { RefactorExampleSource } from "./refactorExampleSource.js"

// ResolveRefactorExamples loads only when reporting because construction must stay inert.
export type ResolveRefactorExamples = (
  source: RefactorExampleSource
) => Effect.Effect<ReadonlyArray<RefactorExample>, ExampleLoadError>
