import { Array, Effect, Schema, pipe } from "effect"
import {
  InlineRefactorExamples,
  type RefactorExampleSource,
  refactorExampleSourceSchema
} from "../example/data.js"
import { Detection, Location } from "../location/data.js"

// AdviceLevel names the advice-scope protocol because consumers must agree on vocabulary.
export type AdviceLevel = "file" | "directory" | "project"

// EvidenceItem is the shared measure/count contract because owners need one vocabulary.
export const EvidenceItem = Schema.Struct({
  measure: Schema.String,
  count: Schema.Number
})

export interface EvidenceItem extends Schema.Schema.Type<typeof EvidenceItem> {}

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

// NamedDetection is the shared name+detection pair because owners need one vocabulary.
export const NamedDetection = Schema.Struct({
  name: Schema.String,
  detection: Detection
})

export interface NamedDetection extends Schema.Schema.Type<typeof NamedDetection> {}

const namedDetectionArray = Schema.Array(NamedDetection)

// FileDetections is the shared path+elements pair because owners need one vocabulary.
export const FileDetections = Schema.Struct({
  path: Schema.String,
  elements: namedDetectionArray
})

export interface FileDetections extends Schema.Schema.Type<typeof FileDetections> {}

const stringCountHashMap = Schema.HashMap(Schema.String, Schema.Number)

// CountSummary holds policy totals and per-policy file breadth because density advice needs them.
export const CountSummary = Schema.Struct({
  total: Schema.Number,
  fileCount: Schema.Number,
  countsByPolicy: stringCountHashMap,
  filesByPolicy: stringCountHashMap
})

export interface CountSummary extends Schema.Schema.Type<typeof CountSummary> {}
