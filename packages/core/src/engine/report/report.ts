import { Array, Effect, Function, HashSet, Match, Record, Struct, pipe } from "effect"
import {
  adviceOrder,
  advicePath,
  adviceText,
  fileAdvicePath,
  isFileLevelAdvice
} from "../derive/derive.js"
import type { Advice } from "../derive/data.js"
import type { ExampleLoadError, RefactorExample } from "../example/data.js"
import { formatRefactorExample, type ResolveRefactorExamples } from "../example/example.js"
import type { Detection } from "../location/data.js"
import { detectionBlockKey, locationText } from "../location/location.js"
import type { Signal, WiringSignals } from "../signal/data.js"
import type { WiringConfig } from "../wiring/data.js"
import { strictEqual } from "../equivalence.js"
import {
  AdviceReportKey,
  EmptyReportEvent,
  ReportBlock,
  RuleReportKey,
  SignalEvent
} from "./data.js"
import type { EmptyReportEvent as EmptyReportEventData, ReportEvent } from "./data.js"

const makeAdviceReportBlock =
  (advice: Advice) =>
  (examples: ReadonlyArray<RefactorExample>): ReportBlock => {
    const pathLabel = advicePath(advice)

    const key = AdviceReportKey.make({
      level: advice.level,
      path: pathLabel,
      title: advice.title
    })

    const text = adviceText(examples)(advice)

    return ReportBlock.make({ key, text })
  }

// Advice blocks keep a stable sort order because consumers rely on that presentation order.
const adviceReportBlocks =
  (resolve: ResolveRefactorExamples) =>
  (advice: ReadonlyArray<Advice>): Effect.Effect<ReadonlyArray<ReportBlock>, ExampleLoadError> => {
    const ordered = Array.sort(advice, adviceOrder)

    const resolveAdviceReportBlock = (item: Advice) =>
      pipe(resolve(item.examples), Effect.map(makeAdviceReportBlock(item)))

    return Effect.forEach(ordered, resolveAdviceReportBlock)
  }

// Local blocks keep the rule key kind because existing NDJSON consumers already key that way.
const checkReportBlocks =
  (name: string) =>
  (elements: ReadonlyArray<Detection>) =>
  (examples: ReadonlyArray<RefactorExample>): ReadonlyArray<ReportBlock> =>
    pipe(
      Array.groupBy(elements, detectionBlockKey),
      Record.values,
      Array.map((group) => {
        const first = Array.headNonEmpty(group)

        const key = RuleReportKey.make({
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

        return ReportBlock.make({ key, text })
      })
    )

const hasDetections = (signal: Signal) => signal.detections.length > 0

// Empty signals skip example loading because they render no report block.
const reportBlocks =
  (resolve: ResolveRefactorExamples) =>
  (signals: ReadonlyArray<Signal>) =>
  (advice: ReadonlyArray<Advice>): Effect.Effect<ReadonlyArray<ReportBlock>, ExampleLoadError> => {
    const adviceBlocks = adviceReportBlocks(resolve)(advice)

    const resolveSignalBlocks = (signal: Signal) =>
      pipe(resolve(signal.examples), Effect.map(checkReportBlocks(signal.name)(signal.detections)))

    const signalBlocks = pipe(
      signals,
      Array.filter(Struct.get("reported")),
      Array.filter(hasDetections),
      Effect.forEach(resolveSignalBlocks),
      Effect.map(Array.flatten)
    )

    return pipe(
      Effect.all({ adviceBlocks, signalBlocks }),
      Effect.map(({ adviceBlocks, signalBlocks }) => Array.appendAll(adviceBlocks, signalBlocks))
    )
  }

export const batchReportBlocks = (config: WiringConfig) => (resolve: ResolveRefactorExamples) =>
  Effect.fn("Report.batchBlocks")(function* (wiringSignals: ReadonlyArray<WiringSignals>) {
    const matchedEntries = pipe(
      Array.zip(config, wiringSignals),
      Array.filter(([, current]) => current.matched)
    )

    const signals = Array.flatMap(matchedEntries, ([, current]) => current.signals)

    const adviceGroups = Array.map(matchedEntries, ([entry, current]) =>
      entry.wiring.derive(current.signals)
    )

    const advice = Array.flatten(adviceGroups)

    return yield* reportBlocks(resolve)(signals)(advice)
  })

// Fallback suppression is required because fallback must not duplicate covered file-level advice.
export const filterFallbackAdviceForUncoveredFiles =
  (specific: ReadonlyArray<Advice>) =>
  (fallbackAdvice: ReadonlyArray<Advice>): ReadonlyArray<Advice> => {
    const fileAdvice = Array.filter(specific, isFileLevelAdvice)
    const paths = Array.map(fileAdvice, fileAdvicePath)
    const coveredFiles = HashSet.fromIterable(paths)

    const isUncovered = (advice: Advice) =>
      pipe(
        Match.value(advice),
        Match.when(isFileLevelAdvice, (fileAdvice) => {
          const path = fileAdvicePath(fileAdvice)

          return !HashSet.has(coveredFiles, path)
        }),
        Match.orElse(Function.constTrue)
      )

    return Array.filter(fallbackAdvice, isUncovered)
  }

export const withFallbackAdvice = Effect.fn("Report.withFallbackAdvice")(function* <E, E2, R, R2>(
  specificAdvice: Effect.Effect<ReadonlyArray<Advice>, E, R>,
  fallbackAdvice: Effect.Effect<ReadonlyArray<Advice>, E2, R2>
): Effect.fn.Return<ReadonlyArray<Advice>, E | E2, R | R2> {
  const specific = yield* specificAdvice
  const fallback = yield* fallbackAdvice
  const uncoveredFallback = filterFallbackAdviceForUncoveredFiles(specific)(fallback)

  return Array.appendAll(specific, uncoveredFallback)
})

// Signal lifting stays beside block construction because event shape must match rendered text.
export const makeBlockSignalEvent = (block: ReportBlock) =>
  SignalEvent.make({ key: block.key, text: block.text })

// Empty stays an explicit event because consumers need a positive nothing-found report.
export const initialReportEvents =
  (rootPath: string) =>
  (blocks: ReadonlyArray<ReportBlock>): ReadonlyArray<ReportEvent> => {
    if (strictEqual(0)(blocks.length)) {
      const emptyReportEvent = EmptyReportEvent.make({ rootPath })

      return Array.of(emptyReportEvent)
    }

    return Array.map(blocks, makeBlockSignalEvent)
  }

const emptyReportText = (event: EmptyReportEventData) => `No signals in ${event.rootPath}.`

// Kept separate from NDJSON because --pretty needs a human-readable event projection.
export const renderEventText = (event: ReportEvent) =>
  pipe(
    Match.value(event),
    Match.tag("signal", Struct.get<SignalEvent, "text">("text")),
    Match.tag("empty", emptyReportText),
    Match.exhaustive
  )
