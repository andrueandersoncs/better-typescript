import { Array, Data, HashSet, Schema, Stream } from "effect"
import type { Check } from "../check/data.js"
import type { Advice } from "../derive/data.js"
import type { RefactorExample } from "../example/data.js"
import type { Detection } from "../location/data.js"

/**
 * NonEmptyCheckPaths is the stable boundary representation exchanged with scopeCheck.
 *
 * @modelRole boundary
 * @remarks It remains explicit because callers need one named contract for 0, length.
 * Removing it would duplicate boundary translation and let wire and in-memory
 * representations drift.
 */
export type NonEmptyCheckPaths = Array.NonEmptyReadonlyArray<string>

/**
 * NamedCheck is the shared name, check, reported, examples contract used by
 * silentCheck, Wiring, and scopeCheck.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
export class NamedCheck extends Data.Class<{
  readonly name: string
  readonly check: Check
  readonly reported: boolean
  readonly examples: ReadonlyArray<RefactorExample>
  readonly paths: ReadonlyArray<string>
}> {}

/**
 * Signal is the shared name, reported, detections, examples contract used by
 * reportBlockUpdates, signalOf, and deriveAdvice.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
export class Signal extends Data.Class<{
  readonly name: string
  readonly reported: boolean
  readonly detections: ReadonlyArray<Detection>
  readonly examples: ReadonlyArray<RefactorExample>
}> {}

/**
 * Wiring is the shared checks, derive contract used by reportBlockUpdates,
 * deriveAdvice, and reportFromWorkspaceConfigs.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
export class Wiring extends Data.Class<{
  readonly checks: ReadonlyArray<NamedCheck>
  readonly derive: (
    signals: ReadonlyArray<Signal>
  ) => Stream.Stream<Advice, Error>
}> {}

/**
 * Public stable identity for an advice report block.
 * @modelRole shared
 * @remarks Public because NDJSON and delta consumers key advice blocks by
 * this stable identity.
 * This model remains explicit because its consumers need the documented contract;
 * removing it would reintroduce that contract at each use site.
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
 * @modelRole shared
 * @remarks The wire tag stays `rule` because report consumers already depend
 * on that key while checks remain the engine model.
 * This model remains explicit because its consumers need the documented contract;
 * removing it would reintroduce that contract at each use site.
 */
export class RuleReportKey extends Schema.TaggedClass<RuleReportKey>()("rule", {
  name: Schema.String,
  message: Schema.String,
  hint: Schema.String
}) {}

/**
 * ReportKey names the compiler syntax protocol handled by its public consumers.
 *
 * @modelRole protocol
 * @remarks It remains explicit because those algorithms must agree on the accepted
 * syntax vocabulary. Removing it would repeat the compiler-node union in each matcher
 * and let their accepted cases drift.
 */
export type ReportKey = AdviceReportKey | RuleReportKey

/**
 * reportKeySchema is the shared members, Type, Encoded, Context contract used by
 * ClearedEvent, SignalEvent, and ReportBlock.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
export const reportKeySchema = Schema.Union(AdviceReportKey, RuleReportKey)

/**
 * A rendered report block with a stable identity across batches: identity is
 * private delta state, key is the public NDJSON identity, text is what the
 * report prints, cleared is the one line printed when the block disappears.
 * @modelRole shared
 * @remarks Identity, key, text, and cleared are separated because deltas and
 * NDJSON consumers need different projections of the same block.
 * This model remains explicit because its consumers need the documented contract;
 * removing it would reintroduce that contract at each use site.
 */
export class ReportBlock extends Schema.Class<ReportBlock>("ReportBlock")({
  identity: Schema.String,
  key: reportKeySchema,
  text: Schema.String,
  cleared: Schema.String
}) {}

const duplicateNameArray = Schema.Array(Schema.String)

/**
 * DuplicateCheckNamesError names the compiler syntax protocol handled by makeWiring.
 *
 * @modelRole protocol
 * @remarks It remains explicit because those algorithms must agree on the accepted
 * syntax vocabulary. Removing it would repeat the compiler-node union in each matcher
 * and let their accepted cases drift.
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

/**
 * DuplicateNameState is the shared seen, collisions, names contract used by
 * emptyDuplicateNameState and addDuplicateName.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
export class DuplicateNameState extends Data.Class<{
  readonly seen: HashSet.HashSet<string>
  readonly collisions: HashSet.HashSet<string>
  readonly names: ReadonlyArray<string>
}> {}
