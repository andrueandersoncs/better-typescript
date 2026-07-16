import { Array, Effect, HashSet, Match, Record, Stream, Struct, Tuple, pipe } from "effect"
import {
  adviceOrder,
  adviceReportBlock,
  collectSignals,
  fileAdvicePath,
  isFileLevelAdvice
} from "../derive/derive.js"
import type { Advice } from "../derive/data.js"
import { formatRefactorExample } from "../example/example.js"
import type { RefactorExample } from "../example/data.js"
import type { Detection } from "../location/data.js"
import { detectionBlockKey, locationText } from "../location/location.js"
import type { Signal, WiringSignals } from "../signal/data.js"
import type { WiringConfig } from "../wiring/data.js"
import { deriveAdvice } from "../wiring/wiring.js"
import { ClearedEvent, EmptyReportEvent, ReportBlock, RuleReportKey, SignalEvent } from "./data.js"
import type { ReportEvent } from "./data.js"

const reportKeyIdentity = (kind: string, parts: ReadonlyArray<string>): string =>
  pipe(Array.prepend(parts, kind), JSON.stringify)

// Advice blocks keep a stable sort order because consumers rely on that presentation order.
export const adviceReportBlocks = (advice: ReadonlyArray<Advice>): ReadonlyArray<ReportBlock> =>
  pipe(advice, Array.sort(adviceOrder), Array.map(adviceReportBlock))

// Local blocks keep the rule key kind because existing NDJSON consumers already key that way.
export const checkReportBlocks =
  (name: string) =>
  (examples: ReadonlyArray<RefactorExample>) =>
  (elements: ReadonlyArray<Detection>): ReadonlyArray<ReportBlock> =>
    pipe(
      Array.groupBy(elements, detectionBlockKey),
      Record.values,
      Array.map((group) => {
        const first = Array.headNonEmpty(group)
        const ruleIdentityParts = Array.make(name, first.message, first.hint)
        const identity = reportKeyIdentity("rule", ruleIdentityParts)

        const key = new RuleReportKey({
          name,
          message: first.message,
          hint: first.hint
        })

        const text = pipe(
          group,
          Array.matchLeft({
            onEmpty: () => name,
            onNonEmpty: (head) => {
              const message = `  ${head.message}`
              const hint = `  Hint: ${head.hint}`
              const examplesText = Array.map(examples, formatRefactorExample)
              const prefixLines2 = Array.make(name, message, hint)
              const header = Array.appendAll(prefixLines2, examplesText)
              const locations = Array.map(group, locationText)
              const lines = Array.appendAll(header, locations)

              return Array.join(lines, "\n")
            }
          })
        )

        const cleared = `${name} — cleared: ${first.message}`

        return new ReportBlock({ identity, key, text, cleared })
      })
    )

// Silent signals stay in the batch because derivation still needs them when they do not render.
export const reportBlocks =
  (signals: ReadonlyArray<Signal>) =>
  (advice: ReadonlyArray<Advice>): ReadonlyArray<ReportBlock> => {
    const adviceBlocks = adviceReportBlocks(advice)

    const signalBlocks = pipe(
      signals,
      Array.filter(Struct.get("reported")),
      Array.flatMap((signal) => checkReportBlocks(signal.name)(signal.examples)(signal.detections))
    )

    return Array.appendAll(adviceBlocks, signalBlocks)
  }

export const batchReportBlocks =
  <E>(config: WiringConfig<E>) =>
  (wiringSignals: ReadonlyArray<WiringSignals>): Effect.Effect<ReadonlyArray<ReportBlock>, E> => {
    const matchedEntries = pipe(
      Array.zip(config, wiringSignals),
      Array.filter(([, current]) => current.matched)
    )

    const signals = Array.flatMap(matchedEntries, ([, current]) => current.signals)

    const advice = Effect.forEach(matchedEntries, ([entry, current]) =>
      deriveAdvice(entry.wiring)(current.signals)
    )

    return pipe(advice, Effect.map(Array.flatten), Effect.map(reportBlocks(signals)))
  }

export const filterFallbackAdviceForUncoveredFiles =
  (specific: ReadonlyArray<Advice>) =>
  <E, R>(fallbackAdvice: Stream.Stream<Advice, E, R>): Stream.Stream<Advice, E, R> => {
    const fileAdvice = Array.filter(specific, isFileLevelAdvice)
    const paths = Array.map(fileAdvice, fileAdvicePath)
    const coveredFiles = HashSet.fromIterable(paths)

    return Stream.filter(fallbackAdvice, (advice) => {
      const isNotFileLevel = advice.level !== "file"
      const isUncoveredFile = !HashSet.has(coveredFiles, advice.location.path)

      return isNotFileLevel || isUncoveredFile
    })
  }

// Fallback suppression is required because fallback must not duplicate covered file-level advice.
export const withFallbackAdvice = <E, R>(
  specificAdvice: Stream.Stream<Advice, E, R>,
  fallbackAdvice: Stream.Stream<Advice, E, R>
): Stream.Stream<Advice, E, R> =>
  pipe(
    collectSignals(specificAdvice),
    Effect.map((specific) => {
      const fallback = filterFallbackAdviceForUncoveredFiles(specific)(fallbackAdvice)

      return pipe(Stream.fromIterable(specific), Stream.concat(fallback))
    }),
    Stream.unwrap
  )

/**
 * Lift one report block into a signal wire event.
 *
 * @remarks
 *   Kept beside block construction so event shape stays aligned with rendered
 *   text and key identity.
 */
export const blockSignalEvent = (block: ReportBlock): SignalEvent =>
  new SignalEvent({ key: block.key, text: block.text })

/**
 * Lift one report block into a cleared wire event.
 *
 * @remarks
 *   Cleared text is precomputed on the block so delta emission does not re-render
 *   after the block has left the current report.
 */
export const blockClearedEvent = (block: ReportBlock): ClearedEvent =>
  new ClearedEvent({ key: block.key, text: block.cleared })

/**
 * Map one report block to its identity entry for delta indexing.
 *
 * @remarks
 *   Identity is the stable comparison key; the full block remains the value so
 *   text diffs can be read without a second lookup.
 */
export const blockEntry = (block: ReportBlock): readonly [string, ReportBlock] =>
  Tuple.make(block.identity, block)

/**
 * Initial watch/report emission: every block as a signal event, or one empty
 * event when the batch has no blocks.
 *
 * @remarks
 *   Empty stays an explicit event because --pretty and NDJSON both need a
 *   positive "nothing found" signal on first report.
 */
export const initialReportEvents =
  (rootPath: string) =>
  (blocks: ReadonlyArray<ReportBlock>): ReadonlyArray<ReportEvent> => {
    const emptyReportEvent = new EmptyReportEvent({ rootPath })
    return blocks.length === 0 ? Array.of(emptyReportEvent) : Array.map(blocks, blockSignalEvent)
  }

const emptyReportText = (event: EmptyReportEvent): string => `No signals in ${event.rootPath}.`

/**
 * Render one event as the human-readable text block the --pretty flag prints.
 *
 * @remarks
 *   Kept separate from NDJSON encoding because --pretty needs a human-readable
 *   projection of the same events.
 */
export const renderEventText = (event: ReportEvent): string =>
  pipe(
    Match.value(event),
    Match.tag("signal", Struct.get<SignalEvent, "text">("text")),
    Match.tag("cleared", Struct.get<ClearedEvent, "text">("text")),
    Match.tag("empty", emptyReportText),
    Match.exhaustive
  )
