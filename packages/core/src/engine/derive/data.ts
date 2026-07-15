import { Array, HashMap, Schema } from "effect"
import { Detection, Location } from "../location/data.js"

/**
 * AdviceLevel names the compiler syntax protocol handled by its public
 * consumers.
 *
 * @remarks
 *   It remains explicit because those algorithms must agree on the accepted
 *   syntax vocabulary. Removing it would repeat the compiler-node union in each
 *   matcher and let their accepted cases drift.
 * @modelRole protocol
 */
export type AdviceLevel = "file" | "directory" | "project"

/**
 * EvidenceItem is the shared measure, count contract used by byMeasure,
 * collisionEvidence, and evidenceText.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
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

/**
 * Advice is the shared location, level, title, remediation contract used by
 * deriveAdvice, adviceReportBlock, and adviceText.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
export class Advice extends Schema.Class<Advice>("Advice")({
  location: Location,
  level: adviceLevelSchema,
  title: Schema.String,
  remediation: Schema.String,
  evidence: evidenceArraySchema
}) {}

/**
 * NamedDetection is the shared name, detection contract used by lineKey,
 * collisionEvidence, and namedDetectionArray.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
export class NamedDetection extends Schema.Class<NamedDetection>("NamedDetection")({
  name: Schema.String,
  detection: Detection
}) {}

const namedDetectionArray = Schema.Array(NamedDetection)

/**
 * FileDetections is the shared path, elements contract used by byFile,
 * addFileCheckCounts, and fileDetections.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
export class FileDetections extends Schema.Class<FileDetections>("FileDetections")({
  path: Schema.String,
  elements: namedDetectionArray
}) {}

/**
 * CountSummary is the shared countsByCheck, filesByCheck, total, fileCount
 * contract used by dominantCheckEvidence and countSummary.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
export class CountSummary extends Schema.Class<CountSummary>("CountSummary")({
  total: Schema.Number,
  fileCount: Schema.Number,
  countsByCheck: Schema.Any,
  filesByCheck: Schema.Any
}) {
  declare readonly countsByCheck: HashMap.HashMap<string, number>
  declare readonly filesByCheck: HashMap.HashMap<string, number>
}
