import { HashMap, Schema } from "effect"
import { Detection, Location } from "../location/data.js"

export type AdviceLevel = "file" | "directory" | "project"

export class EvidenceItem extends Schema.Class<EvidenceItem>("EvidenceItem")({
  measure: Schema.String,
  count: Schema.Number
}) {}

const adviceLevelSchema = Schema.Literal("file", "directory", "project")
const evidenceArraySchema = Schema.Array(EvidenceItem)

export class Advice extends Schema.Class<Advice>("Advice")({
  location: Location,
  level: adviceLevelSchema,
  title: Schema.String,
  remediation: Schema.String,
  evidence: evidenceArraySchema
}) {}

export class NamedDetection extends Schema.Class<NamedDetection>(
  "NamedDetection"
)({
  name: Schema.String,
  detection: Detection
}) {}

const namedDetectionArray = Schema.Array(NamedDetection)

export class FileDetections extends Schema.Class<FileDetections>(
  "FileDetections"
)({
  path: Schema.String,
  elements: namedDetectionArray
}) {}

export class CountSummary extends Schema.Class<CountSummary>("CountSummary")({
  total: Schema.Number,
  fileCount: Schema.Number,
  countsByCheck: Schema.Any,
  filesByCheck: Schema.Any
}) {
  declare readonly countsByCheck: HashMap.HashMap<string, number>
  declare readonly filesByCheck: HashMap.HashMap<string, number>
}
