import { Array, Effect, Schema, pipe } from "effect"
import { InlineRefactorExamples } from "../example/inlineRefactorExamples.js"
import type { RefactorExampleSource } from "../example/refactorExampleSource.js"
import { refactorExampleSourceSchema } from "../example/refactorExampleSourceSchema.js"
import { Location } from "../location/locationData.js"
import { EvidenceItem } from "./evidenceItem.js"

const adviceLevelValues = Array.make<["file", "directory", "project"]>(
  "file",
  "directory",
  "project"
)

const adviceLevelSchema = Schema.Literals(adviceLevelValues)
const evidenceArraySchema = Schema.Array(EvidenceItem)
const emptyExamples = Array.empty()

const emptyRefactorExampleSource: RefactorExampleSource = InlineRefactorExamples.make({
  examples: emptyExamples
})

const emptyRefactorExampleSourceEffect = Effect.succeed(emptyRefactorExampleSource)

const refactorExamplesSchema = pipe(
  refactorExampleSourceSchema,
  Schema.withConstructorDefault(emptyRefactorExampleSourceEffect)
)

// Advice is the shared advice payload because report owners need one vocabulary.
export const Advice = Schema.Struct({
  location: Location,
  level: adviceLevelSchema,
  title: Schema.String,
  remediation: Schema.String,
  evidence: evidenceArraySchema,
  examples: refactorExamplesSchema
})

export interface Advice extends Schema.Schema.Type<typeof Advice> {}
