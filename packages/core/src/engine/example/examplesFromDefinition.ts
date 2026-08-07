import { Function, Option, pipe } from "effect"
import { InlineRefactorExamples } from "./inlineRefactorExamples.js"
import type { RefactorExampleSource } from "./refactorExampleSource.js"
import type { RefactorExample } from "./refactorExample.js"
import { Array } from "effect"

const emptyExamples = Array.empty<RefactorExample>()

export const emptyRefactorExampleSource: RefactorExampleSource = InlineRefactorExamples.make({
  examples: emptyExamples
})

// Default empty examples because policy seeds may omit refactor samples.
export const examplesFromDefinition = (examples: Option.Option<RefactorExampleSource>) =>
  pipe(examples, Option.getOrElse(Function.constant(emptyRefactorExampleSource)))
