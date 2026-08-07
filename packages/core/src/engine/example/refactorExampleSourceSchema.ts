import { Array, Schema } from "effect"
import { DirectoryRefactorExamples } from "./directoryRefactorExamples.js"
import { InlineRefactorExamples } from "./inlineRefactorExamples.js"

const refactorExampleSourceMembers = Array.make(InlineRefactorExamples, DirectoryRefactorExamples)

// refactorExampleSourceSchema is the runtime codec because report and advice share it.
export const refactorExampleSourceSchema = Schema.Union(refactorExampleSourceMembers)
