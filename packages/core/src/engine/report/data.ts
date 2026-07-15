import { Array, Data, HashSet, Schema, Stream } from "effect"
import type { Check } from "../check/data.js"
import type { Advice } from "../derive/data.js"
import type { RefactorExample } from "../example/data.js"
import type { Detection } from "../location/data.js"

/**
 * NamedCheck binds a stable check name and reporting policy to its executable
 * check and remediation examples.
 *
 * @remarks
 *   It remains explicit because preset wiring, check execution, and advice
 *   derivation must use the same check identity. Removing it would duplicate
 *   that contract across those consumers and risk mismatched names.
 * @modelRole shared
 */
export class NamedCheck extends Data.Class<{
  readonly name: string
  readonly check: Check
  readonly reported: boolean
  readonly examples: ReadonlyArray<RefactorExample>
}> {}

/**
 * Signal is the materialized result of one named check for one wiring scope.
 *
 * @remarks
 *   It remains explicit because rendering and aggregate advice consume the same
 *   detections, reporting policy, and examples. Removing it would split those
 *   correlated values into parallel collections at every consumer.
 * @modelRole shared
 */
export class Signal extends Data.Class<{
  readonly name: string
  readonly reported: boolean
  readonly detections: ReadonlyArray<Detection>
  readonly examples: ReadonlyArray<RefactorExample>
}> {}

/**
 * Wiring defines the complete check set and advice derivation for one scope.
 *
 * @remarks
 *   It remains explicit because configuration loading and report execution
 *   exchange checks with their matching derivation function. Removing it would
 *   let those two halves be configured independently and drift.
 * @modelRole shared
 */
export class Wiring extends Data.Class<{
  readonly checks: ReadonlyArray<NamedCheck>
  readonly derive: (signals: ReadonlyArray<Signal>) => Stream.Stream<Advice, Error>
}> {}

/**
 * WiringEntry associates one validated file scope with the wiring it activates.
 *
 * @remarks
 *   It remains explicit because configuration authors and the report engine need
 *   one stable scope-to-wiring contract. Removing it would recreate that
 *   pairing as positional arrays or anonymous objects at the boundary.
 * @modelRole boundary
 */
export class WiringEntry extends Data.Class<{
  readonly files: Array.NonEmptyReadonlyArray<string>
  readonly wiring: Wiring
}> {}

/**
 * WiringConfig is the ordered configuration boundary consumed by reporting.
 *
 * @remarks
 *   It remains explicit because configuration loading, validation, and execution
 *   must preserve entry order. Removing it would repeat the collection contract
 *   at each interface and obscure that ordering requirement.
 * @modelRole boundary
 */
export type WiringConfig = ReadonlyArray<WiringEntry>

/**
 * WiringSignals records whether one wiring matched and the signals it produced.
 *
 * @remarks
 *   It remains explicit because collection and report derivation must distinguish
 *   an unmatched wiring from a matched wiring with no detections. Removing it
 *   would collapse those states or require parallel result arrays.
 * @modelRole shared
 */
export class WiringSignals extends Data.Class<{
  readonly matched: boolean
  readonly signals: ReadonlyArray<Signal>
}> {}

/**
 * AdviceReportKey is the stable wire identity for one aggregate advice block.
 *
 * @remarks
 *   It remains explicit because NDJSON and delta consumers key advice blocks by
 *   the same tagged fields. Removing it would duplicate wire identity
 *   construction and parsing at every producer and consumer.
 * @modelRole protocol
 */
export class AdviceReportKey extends Schema.TaggedClass<AdviceReportKey>()("advice", {
  level: Schema.String,
  path: Schema.String,
  title: Schema.String
}) {}

/**
 * RuleReportKey is the stable wire identity for one local detection block.
 *
 * @remarks
 *   The wire tag remains `rule` because existing report consumers depend on it
 *   while checks remain the engine model. Removing the named protocol would
 *   duplicate its compatibility contract at every event schema and renderer.
 * @modelRole protocol
 */
export class RuleReportKey extends Schema.TaggedClass<RuleReportKey>()("rule", {
  name: Schema.String,
  message: Schema.String,
  hint: Schema.String
}) {}

/**
 * ReportKey is the tagged identity protocol shared by all report block kinds.
 *
 * @remarks
 *   It remains explicit because block construction, event schemas, and renderers
 *   must exhaust the same key variants. Removing it would repeat the union and
 *   allow consumers to accept different report identities.
 * @modelRole protocol
 */
export type ReportKey = AdviceReportKey | RuleReportKey

/**
 * ReportKeySchema is the runtime codec for the ReportKey wire boundary.
 *
 * @remarks
 *   It remains explicit because report blocks and watch events must validate the
 *   same tagged union. Removing it would duplicate schema assembly and let
 *   runtime validation drift from the TypeScript contract.
 * @modelRole boundary
 */
export const reportKeySchema = Schema.Union(AdviceReportKey, RuleReportKey)

/**
 * ReportBlock carries one rendered block and both identities needed for stable
 * delta updates and NDJSON output.
 *
 * @remarks
 *   It remains explicit because delta comparison, rendering, and wire events need
 *   different projections of the same block. Removing it would split those
 *   correlated values and duplicate projection logic across the pipeline.
 * @modelRole boundary
 */
export class ReportBlock extends Schema.Class<ReportBlock>("ReportBlock")({
  identity: Schema.String,
  key: reportKeySchema,
  text: Schema.String,
  cleared: Schema.String
}) {}

const duplicateNameArray = Schema.Array(Schema.String)

/**
 * DuplicateCheckNamesError is the failure protocol for ambiguous check
 * identity.
 *
 * @remarks
 *   It remains explicit because wiring validation and CLI error handling need the
 *   same structured collision names. Removing it would reduce the error to
 *   prose and force consumers to parse an unstable message.
 * @modelRole protocol
 */
export class DuplicateCheckNamesError extends Schema.TaggedError<DuplicateCheckNamesError>(
  "DuplicateCheckNamesError"
)("DuplicateCheckNamesError", {
  names: duplicateNameArray
}) {
  get message(): string {
    return `Duplicate check names: ${Array.join(this.names, ", ")}`
  }
}

const invalidWiringIndexArray = Schema.Array(Schema.Number)

/**
 * InvalidWiringFilesError is the failure protocol for invalid wiring file
 * scopes.
 *
 * @remarks
 *   It remains explicit because configuration validation and CLI error handling
 *   need the exact invalid entry indexes. Removing it would hide that
 *   structured evidence in prose and duplicate error parsing at the boundary.
 * @modelRole protocol
 */
export class InvalidWiringFilesError extends Schema.TaggedError<InvalidWiringFilesError>(
  "InvalidWiringFilesError"
)("InvalidWiringFilesError", {
  indexes: invalidWiringIndexArray
}) {
  get message(): string {
    const indexes = Array.map(this.indexes, String)

    return `Wiring files must be non-empty glob arrays at indexes: ${Array.join(indexes, ", ")}`
  }
}

/**
 * DuplicateNameState is the accumulated identity state for wiring validation.
 *
 * @remarks
 *   It remains explicit because the empty-state constructor, incremental reducer,
 *   and final validator must preserve first-seen order and collisions. Removing
 *   it would spread three synchronized collections across those owners.
 * @modelRole shared
 */
export class DuplicateNameState extends Data.Class<{
  readonly seen: HashSet.HashSet<string>
  readonly collisions: HashSet.HashSet<string>
  readonly names: ReadonlyArray<string>
}> {}
