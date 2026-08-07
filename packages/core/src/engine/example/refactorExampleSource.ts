import type { DirectoryRefactorExamples } from "./directoryRefactorExamples.js"
import type { InlineRefactorExamples } from "./inlineRefactorExamples.js"

// RefactorExampleSource is the inert example descriptor because owners must not load.
export type RefactorExampleSource = InlineRefactorExamples | DirectoryRefactorExamples
