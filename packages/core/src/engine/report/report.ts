import { Array, Effect, HashSet, Match, Record, Stream, Struct, Tuple, pipe } from "effect"
import {
  adviceHeader,
  adviceOrder,
  advicePath,
  adviceText,
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
import type { Wiring, WiringConfig } from "../wiring/data.js"
import {
  AdviceReportKey,
  ClearedEvent,
  EmptyReportEvent,
  ReportBlock,
  RuleReportKey,
  SignalEvent
} from "./data.js"
import type { ReportEvent } from "./data.js"

const reportKeyIdentity = (kind: string, parts: ReadonlyArray<string>) =>
  pipe(Array.prepend(parts, kind), JSON.stringify)

const adviceReportBlock = (advice: Advice) => {
  const pathLabel = advicePath(advice)
  const adviceIdentityParts = Array.make(advice.level, pathLabel, advice.title)
  const identity = reportKeyIdentity("advice", adviceIdentityParts)

  const key = new AdviceReportKey({
    level: advice.level,
    path: pathLabel,
    title: advice.title
  })

  const text = adviceText(advice)
  const header = adviceHeader(advice)
  const cleared = `${header} — cleared`

  return new ReportBlock({ identity, key, text, cleared })
}

// Derivation takes the full signal array because advice must see every signal from the same batch.
const deriveAdvice =
  <E>(wiring: Wiring<E>) =>
  (signals: ReadonlyArray<Signal>): Effect.Effect<ReadonlyArray<Advice>, E> =>
    pipe(wiring.derive(signals), collectSignals)

// Advice blocks keep a stable sort order because consumers rely on that presentation order.
export const adviceReportBlocks = (advice: ReadonlyArray<Advice>): ReadonlyArray<ReportBlock> => {
  const ordered = Array.sort(advice, adviceOrder)

  return Array.map(ordered, adviceReportBlock)
}

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

// Signal lifting stays beside block construction because event shape must match rendered text.
export const blockSignalEvent = (block: ReportBlock) =>
  new SignalEvent({ key: block.key, text: block.text })

// Cleared text is precomputed on the block because delta emission must not re-render gone blocks.
export const blockClearedEvent = (block: ReportBlock) =>
  new ClearedEvent({ key: block.key, text: block.cleared })

// Identity keys the entry and the block stays the value because diffs need both without lookups.
export const blockEntry = (block: ReportBlock): readonly [string, ReportBlock] =>
  Tuple.make(block.identity, block)

// Empty stays an explicit event because consumers need a positive nothing-found first report.
export const initialReportEvents =
  (rootPath: string) =>
  (blocks: ReadonlyArray<ReportBlock>): ReadonlyArray<ReportEvent> => {
    const emptyReportEvent = new EmptyReportEvent({ rootPath })
    return blocks.length === 0 ? Array.of(emptyReportEvent) : Array.map(blocks, blockSignalEvent)
  }

const emptyReportText = (event: EmptyReportEvent) => `No signals in ${event.rootPath}.`

// Kept separate from NDJSON because --pretty needs a human-readable projection of the same events.
export const renderEventText = (event: ReportEvent) =>
  pipe(
    Match.value(event),
    Match.tag("signal", Struct.get<SignalEvent, "text">("text")),
    Match.tag("cleared", Struct.get<ClearedEvent, "text">("text")),
    Match.tag("empty", emptyReportText),
    Match.exhaustive
  )
