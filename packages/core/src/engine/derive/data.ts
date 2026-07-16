import { Array, Effect, HashMap, Schema, pipe } from "effect"
import { RefactorExample } from "../example/data.js"
import { Detection, Location } from "../location/data.js"

// AdviceLevel names the advice-scope protocol because consumers must agree on vocabulary.
export type AdviceLevel = "file" | "directory" | "project"

// EvidenceItem is the shared measure/count contract because owners need one vocabulary.
export class EvidenceItem extends Schema.Class<EvidenceItem>("EvidenceItem")({
  measure: Schema.String,
  count: Schema.Number
}) {}

const adviceLevelValues = Array.make<["file", "directory", "project"]>(
  "file",
  "directory",
  "project"
)

const adviceLevelSchema = Schema.Literals(adviceLevelValues)
const evidenceArraySchema = Schema.Array(EvidenceItem)
const emptyRefactorExamples = Array.empty<RefactorExample>()
const emptyRefactorExamplesEffect = Effect.succeed(emptyRefactorExamples)

const refactorExamplesSchema = pipe(
  Schema.Array(RefactorExample),
  Schema.withConstructorDefault(emptyRefactorExamplesEffect)
)

// Advice is the shared advice payload because report owners need one vocabulary.
export class Advice extends Schema.Class<Advice>("Advice")({
  location: Location,
  level: adviceLevelSchema,
  title: Schema.String,
  remediation: Schema.String,
  evidence: evidenceArraySchema,
  examples: refactorExamplesSchema
}) {}

// NamedDetection is the shared name+detection pair because owners need one vocabulary.
export class NamedDetection extends Schema.Class<NamedDetection>("NamedDetection")({
  name: Schema.String,
  detection: Detection
}) {}

const namedDetectionArray = Schema.Array(NamedDetection)

// FileDetections is the shared path+elements pair because owners need one vocabulary.
export class FileDetections extends Schema.Class<FileDetections>("FileDetections")({
  path: Schema.String,
  elements: namedDetectionArray
}) {}

// CountSummary is the shared counts/totals contract because owners need one vocabulary.
export class CountSummary extends Schema.Class<CountSummary>("CountSummary")({
  total: Schema.Number,
  fileCount: Schema.Number,
  countsByCheck: Schema.Any,
  filesByCheck: Schema.Any
}) {
  declare readonly countsByCheck: HashMap.HashMap<string, number>
  declare readonly filesByCheck: HashMap.HashMap<string, number>
}
