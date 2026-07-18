import {
  Array,
  Effect,
  Function,
  HashSet,
  Match,
  Record,
  Stream,
  Struct,
  Tuple,
  pipe
} from "effect"
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
import type { ExampleLoadError, RefactorExample } from "../example/data.js"
import { formatRefactorExample, type ResolveRefactorExamples } from "../example/example.js"
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

const makeAdviceReportBlock =
  (advice: Advice) =>
  (examples: ReadonlyArray<RefactorExample>): ReportBlock => {
    const pathLabel = advicePath(advice)
    const adviceIdentityParts = Array.make(advice.level, pathLabel, advice.title)
    const identity = reportKeyIdentity("advice", adviceIdentityParts)

    const key = new AdviceReportKey({
      level: advice.level,
      path: pathLabel,
      title: advice.title
    })

    const text = adviceText(examples)(advice)
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
export const adviceReportBlocks =
  (resolve: ResolveRefactorExamples) =>
  (advice: ReadonlyArray<Advice>): Effect.Effect<ReadonlyArray<ReportBlock>, ExampleLoadError> => {
    const ordered = Array.sort(advice, adviceOrder)

    return Effect.forEach(ordered, (item) =>
      pipe(resolve(item.examples), Effect.map(makeAdviceReportBlock(item)))
    )
  }

// Local blocks keep the rule key kind because existing NDJSON consumers already key that way.
export const checkReportBlocks =
  (name: string) =>
  (elements: ReadonlyArray<Detection>) =>
  (examples: ReadonlyArray<RefactorExample>): ReadonlyArray<ReportBlock> =>
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

const hasDetections = (signal: Signal) => signal.detections.length > 0

// Empty signals skip example loading because they render no report block.
export const reportBlocks =
  (resolve: ResolveRefactorExamples) =>
  (signals: ReadonlyArray<Signal>) =>
  (advice: ReadonlyArray<Advice>): Effect.Effect<ReadonlyArray<ReportBlock>, ExampleLoadError> => {
    const adviceBlocks = adviceReportBlocks(resolve)(advice)

    const signalBlocks = pipe(
      signals,
      Array.filter(Struct.get("reported")),
      Array.filter(hasDetections),
      Effect.forEach((signal) =>
        pipe(
          resolve(signal.examples),
          Effect.map(checkReportBlocks(signal.name)(signal.detections))
        )
      ),
      Effect.map(Array.flatten)
    )

    return pipe(
      Effect.all({ adviceBlocks, signalBlocks }),
      Effect.map(({ adviceBlocks, signalBlocks }) => Array.appendAll(adviceBlocks, signalBlocks))
    )
  }

export const batchReportBlocks =
  <E>(config: WiringConfig<E>) =>
  (resolve: ResolveRefactorExamples) =>
  (
    wiringSignals: ReadonlyArray<WiringSignals>
  ): Effect.Effect<ReadonlyArray<ReportBlock>, E | ExampleLoadError> => {
    const matchedEntries = pipe(
      Array.zip(config, wiringSignals),
      Array.filter(([, current]) => current.matched)
    )

    const signals = Array.flatMap(matchedEntries, ([, current]) => current.signals)

    const advice = Effect.forEach(matchedEntries, ([entry, current]) =>
      deriveAdvice(entry.wiring)(current.signals)
    )

    return pipe(advice, Effect.map(Array.flatten), Effect.flatMap(reportBlocks(resolve)(signals)))
  }

export const filterFallbackAdviceForUncoveredFiles =
  (specific: ReadonlyArray<Advice>) =>
  <E, R>(fallbackAdvice: Stream.Stream<Advice, E, R>): Stream.Stream<Advice, E, R> => {
    const fileAdvice = Array.filter(specific, isFileLevelAdvice)
    const paths = Array.map(fileAdvice, fileAdvicePath)
    const coveredFiles = HashSet.fromIterable(paths)

    return pipe(
      fallbackAdvice,
      Stream.filter((advice) =>
        pipe(
          Match.value(advice),
          Match.when(isFileLevelAdvice, (fileAdvice) => {
            const path = fileAdvicePath(fileAdvice)
            return !HashSet.has(coveredFiles, path)
          }),
          Match.orElse(Function.constTrue)
        )
      )
    )
  }

// Fallback suppression is required because fallback must not duplicate covered file-level advice.
export const withFallbackAdvice = <E, R>(
  specificAdvice: Stream.Stream<Advice, E, R>,
  fallbackAdvice: Stream.Stream<Advice, E, R>
): Stream.Stream<Advice, E, R> =>
  pipe(
    collectSignals(specificAdvice),
    Effect.map((specific) => {
      const filteredFallback = filterFallbackAdviceForUncoveredFiles(specific)(fallbackAdvice)
      const specificStream = Stream.fromIterable(specific)

      return Stream.concat(specificStream, filteredFallback)
    }),
    Stream.unwrap
  )

// Signal lifting stays beside block construction because event shape must match rendered text.
export const makeBlockSignalEvent = (block: ReportBlock) =>
  new SignalEvent({ key: block.key, text: block.text })

// Cleared text is precomputed on the block because delta emission must not re-render gone blocks.
export const makeBlockClearedEvent = (block: ReportBlock) =>
  new ClearedEvent({ key: block.key, text: block.cleared })

// Identity keys the entry and the block stays the value because diffs need both without lookups.
export const blockEntry = (block: ReportBlock): readonly [string, ReportBlock] =>
  Tuple.make(block.identity, block)

// Empty stays an explicit event because consumers need a positive nothing-found first report.
export const initialReportEvents =
  (rootPath: string) =>
  (blocks: ReadonlyArray<ReportBlock>): ReadonlyArray<ReportEvent> => {
    if (blocks.length === 0) {
      const emptyReportEvent = new EmptyReportEvent({ rootPath })

      return Array.of(emptyReportEvent)
    }

    return Array.map(blocks, makeBlockSignalEvent)
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
