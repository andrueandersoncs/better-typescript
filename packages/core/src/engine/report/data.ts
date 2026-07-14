import {
  Array,
  Data,
  HashSet,
  MutableHashMap,
  MutableList,
  Schema,
  Stream
} from "effect"
import type { Check } from "../check/data.js"
import type { Advice } from "../derive/data.js"
import type { RefactorExample } from "../example/data.js"
import type { Detection } from "../location/data.js"

export type NonEmptyCheckPaths = Array.NonEmptyReadonlyArray<string>

export class NamedCheck extends Data.Class<{
  readonly name: string
  readonly check: Check
  readonly reported: boolean
  readonly examples: ReadonlyArray<RefactorExample>
  readonly paths: ReadonlyArray<string>
}> {}

export class Signal extends Data.Class<{
  readonly name: string
  readonly reported: boolean
  readonly detections: ReadonlyArray<Detection>
  readonly examples: ReadonlyArray<RefactorExample>
}> {}

export class MutableDedupeState extends Data.Class<{
  readonly seen: MutableHashMap.MutableHashMap<string, ReadonlyArray<Detection>>
  readonly elements: MutableList.MutableList<Detection>
}> {}

export class Wiring extends Data.Class<{
  readonly checks: ReadonlyArray<NamedCheck>
  readonly derive: (
    signals: ReadonlyArray<Signal>
  ) => Stream.Stream<Advice, Error>
}> {}

/**
 * Public stable identity for an advice report block.
 * @remarks Public because NDJSON and delta consumers key advice blocks by
 * this stable identity.
 */
export class AdviceReportKey extends Schema.TaggedClass<AdviceReportKey>()(
  "advice",
  {
    level: Schema.String,
    path: Schema.String,
    title: Schema.String
  }
) {}

/**
 * Public stable identity for a local detection report block. The `_tag: "rule"`
 * wire key is retained for report compatibility while checks are the engine model.
 * @remarks The wire tag stays `rule` because report consumers already depend
 * on that key while checks remain the engine model.
 */
export class RuleReportKey extends Schema.TaggedClass<RuleReportKey>()("rule", {
  name: Schema.String,
  message: Schema.String,
  hint: Schema.String
}) {}

export type ReportKey = AdviceReportKey | RuleReportKey

export const reportKeySchema = Schema.Union(AdviceReportKey, RuleReportKey)

/**
 * A rendered report block with a stable identity across batches: identity is
 * private delta state, key is the public NDJSON identity, text is what the
 * report prints, cleared is the one line printed when the block disappears.
 * @remarks Identity, key, text, and cleared are separated because deltas and
 * NDJSON consumers need different projections of the same block.
 */
export class ReportBlock extends Schema.Class<ReportBlock>("ReportBlock")({
  identity: Schema.String,
  key: reportKeySchema,
  text: Schema.String,
  cleared: Schema.String
}) {}

const duplicateNameArray = Schema.Array(Schema.String)

export class DuplicateCheckNamesError extends Schema.TaggedError<DuplicateCheckNamesError>(
  "DuplicateCheckNamesError"
)("DuplicateCheckNamesError", {
  names: duplicateNameArray
}) {
  get message(): string {
    return `Duplicate check names: ${Array.join(this.names, ", ")}`
  }
}

export class DuplicateNameState extends Data.Class<{
  readonly seen: HashSet.HashSet<string>
  readonly collisions: HashSet.HashSet<string>
  readonly names: ReadonlyArray<string>
}> {}
