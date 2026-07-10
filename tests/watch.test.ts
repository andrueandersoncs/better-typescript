import * as assert from "node:assert/strict"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import {
  Chunk,
  Effect,
  Fiber,
  HashMap,
  Option,
  Queue,
  Stream,
  pipe
} from "effect"
import * as ts from "typescript"
import { Location, locateNode } from "../src/engine/location.js"
import {
  AdviceReportKey,
  namedCheck,
  ReportBlock,
  reportBlocksFromWiring,
  RuleReportKey,
  Signal,
  type NamedCheck,
  type ReportKey,
  type Wiring
} from "../src/engine/report.js"
import {
  checkFromSubscriptions,
  nodeSubscription,
  Detection,
  type Check
} from "../src/engine/check.js"
import {
  astNodes,
  contextFor,
  diffCheckableFiles
} from "../src/engine/sources.js"
import type { Advice } from "../src/engine/derive.js"
import {
  ClearedEvent,
  EmptyReportEvent,
  SignalEvent,
  WorkspaceUpdate,
  reportBlockUpdates,
  blockDelta,
  blockDeltas,
  renderEventText,
  reportEventsFromWiring,
  signalUpdates,
  signalsEquivalence,
  watchReportFromWiring,
  type ReportEvent
} from "../src/engine/watch.js"
import { discoverWorkspace, loadProject } from "../src/project/loadProject.js"
import type { LoadedProject } from "../src/project/loadProject.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const noThrowFixturePath = path.join(testDirectory, "fixtures", "no-throw")
const probeName = "probe throw statements"
const probeMessage = "throw statement"
const probeHint = "yield typed errors instead of throwing"

const collectStream = <A>(
  stream: Stream.Stream<A, Error>
): Promise<ReadonlyArray<A>> =>
  Effect.runPromise(
    Effect.map(Stream.runCollect(stream), Chunk.toReadonlyArray)
  )

const loadFixtureProject = async (): Promise<LoadedProject> => {
  const workspace = await Effect.runPromise(loadProject(noThrowFixturePath))
  const [project] = workspace.projects

  assert.ok(project, "expected the no-throw fixture to load one project")

  return project
}

const throwProbeCheck: Check = checkFromSubscriptions(() => [
  nodeSubscription([ts.SyntaxKind.ThrowStatement])((context) => (node) => [
    new Detection({
      location: locateNode(context)(node),
      message: probeMessage,
      hint: probeHint
    })
  ])
])

const throwProbeNamedCheck: NamedCheck = namedCheck(probeName, throwProbeCheck)

const probeWiring: Wiring = {
  checks: [throwProbeNamedCheck],
  derive: () => Stream.empty
}

const pollingWatchOptions: ts.WatchOptions = {
  watchFile: ts.WatchFileKind.FixedPollingInterval,
  watchDirectory: ts.WatchDirectoryKind.FixedPollingInterval,
  fallbackPolling: ts.PollingWatchKind.FixedInterval
}

const location = (filePath: string, line: number, column: number): Location =>
  new Location({ path: filePath, line, column })

const testReportKey = (name: string): ReportKey =>
  new RuleReportKey({ name, message: name, hint: name })

const block = (identity: string, text: string, cleared: string): ReportBlock =>
  new ReportBlock({ identity, key: testReportKey(identity), text, cleared })

const signal = (keyName: string, text: string): SignalEvent =>
  new SignalEvent({ key: testReportKey(keyName), text })

const clearedEvent = (keyName: string, text: string): ClearedEvent =>
  new ClearedEvent({ key: testReportKey(keyName), text })

const detectionAt = (
  line: number,
  message: string,
  data?: unknown
): Detection =>
  new Detection({
    location: location("src/cases.ts", line, 1),
    message,
    hint: probeHint,
    data
  })

const batchOf = (
  detections: ReadonlyArray<Detection>
): ReadonlyArray<Signal> => [
  new Signal({ name: probeName, reported: true, detections })
]

test("blockDelta emits every current block as a signal event when there is no previous report", () => {
  const a = block("a", "text a", "a cleared")
  const b = block("b", "text b", "b cleared")

  assert.deepEqual(blockDelta([])([a, b]), [
    signal("a", "text a"),
    signal("b", "text b")
  ])
})

test("blockDelta re-emits exactly the block whose text changed", () => {
  const a = block("a", "text a", "a cleared")
  const b = block("b", "text b", "b cleared")
  const changedB = block("b", "text b changed", "b cleared")

  assert.deepEqual(blockDelta([a, b])([a, changedB]), [
    signal("b", "text b changed")
  ])
})

test("blockDelta emits the cleared event for a removed block key", () => {
  const a = block("a", "text a", "a cleared")
  const b = block("b", "text b", "b cleared")

  assert.deepEqual(blockDelta([a, b])([a]), [clearedEvent("b", "b cleared")])
})

test("blockDelta emits clearances before changed and new blocks", () => {
  const a = block("a", "text a", "a cleared")
  const b = block("b", "text b", "b cleared")
  const changedA = block("a", "text a changed", "a cleared")
  const c = block("c", "text c", "c cleared")

  assert.deepEqual(blockDelta([a, b])([changedA, c]), [
    clearedEvent("b", "b cleared"),
    signal("a", "text a changed"),
    signal("c", "text c")
  ])
})

test("blockDelta emits nothing for identical reports", () => {
  const a = block("a", "text a", "a cleared")
  const b = block("b", "text b", "b cleared")

  assert.deepEqual(blockDelta([a, b])([a, b]), [])
})

test("blockDeltas emits the full first report and only deltas afterwards", async () => {
  const a = block("a", "text a", "a cleared")
  const changedA = block("a", "text a changed", "a cleared")
  const events = await collectStream(
    pipe(Stream.fromIterable([[a], [a], [changedA]]), blockDeltas("/root"))
  )

  assert.deepEqual(events, [
    signal("a", "text a"),
    signal("a", "text a changed")
  ])
})

test("blockDeltas emits the empty-report event for an empty first report", async () => {
  const events = await collectStream(
    pipe(Stream.fromIterable([[]]), blockDeltas("/root"))
  )

  assert.deepEqual(events, [new EmptyReportEvent({ rootPath: "/root" })])
})

test("renderEventText renders events as the pretty text blocks", () => {
  assert.equal(renderEventText(signal("a", "text a")), "text a")
  assert.equal(
    renderEventText(clearedEvent("a", "a — cleared: m")),
    "a — cleared: m"
  )
  assert.equal(
    renderEventText(new EmptyReportEvent({ rootPath: "/root" })),
    "No signals in /root."
  )
})

test("report events stringify to NDJSON objects with structured keys", () => {
  const key = { _tag: "rule", name: "k", message: "k", hint: "k" }

  assert.deepEqual(JSON.parse(JSON.stringify(signal("k", "t"))), {
    _tag: "signal",
    key,
    text: "t"
  })
  assert.deepEqual(JSON.parse(JSON.stringify(clearedEvent("k", "t"))), {
    _tag: "cleared",
    key,
    text: "t"
  })
  assert.deepEqual(
    JSON.parse(JSON.stringify(new EmptyReportEvent({ rootPath: "/root" }))),
    { _tag: "empty", rootPath: "/root" }
  )
})

test("reportEventsFromWiring emits initial signal events from the same wiring projection", async () => {
  const workspace = await Effect.runPromise(loadProject(noThrowFixturePath))
  const blocks = await Effect.runPromise(
    reportBlocksFromWiring(probeWiring)(workspace)
  )
  const events = await collectStream(
    reportEventsFromWiring(probeWiring)(workspace)
  )
  const expected = blocks.map(
    (reportBlock) =>
      new SignalEvent({
        key: reportBlock.key,
        text: reportBlock.text
      })
  )

  assert.ok(blocks.length > 0, "expected the fixture to produce report blocks")
  assert.deepEqual(events, expected)
})

test("reportEventsFromWiring emits one empty event for a signal-free workspace", async () => {
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "report-events-empty-")
  )

  try {
    await fs.cp(noThrowFixturePath, tempDir, { recursive: true })
    await fs.rm(path.join(tempDir, "src", "cases.ts"))

    const workspace = await Effect.runPromise(loadProject(tempDir))
    const events = await collectStream(
      reportEventsFromWiring(probeWiring)(workspace)
    )

    assert.deepEqual(events, [
      new EmptyReportEvent({ rootPath: workspace.rootPath })
    ])
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
})

test("signalsEquivalence accepts equal detection sets", () => {
  const a = batchOf([
    detectionAt(4, probeMessage),
    detectionAt(9, probeMessage)
  ])
  const b = batchOf([
    detectionAt(4, probeMessage),
    detectionAt(9, probeMessage)
  ])

  assert.equal(signalsEquivalence(a, b), true)
})

test("signalsEquivalence rejects a moved location or a changed message", () => {
  const base = batchOf([detectionAt(4, probeMessage)])
  const moved = batchOf([detectionAt(5, probeMessage)])
  const reworded = batchOf([detectionAt(4, "throw expression")])

  assert.equal(signalsEquivalence(base, moved), false)
  assert.equal(signalsEquivalence(base, reworded), false)
})

test("signalsEquivalence under-cuts on fresh non-Equal detection data by design", () => {
  const a = batchOf([detectionAt(4, probeMessage, { target: "local" })])
  const b = batchOf([detectionAt(4, probeMessage, { target: "local" })])

  assert.equal(signalsEquivalence(a, b), false)
})

test("signalUpdates and reportBlockUpdates derive one signal array and advice-first blocks per element", async () => {
  const project = await loadFixtureProject()
  const snapshot = await Effect.runPromise(Stream.runCollect(astNodes(project)))
  const update = new WorkspaceUpdate({
    snapshots: [snapshot]
  })
  const fixedAdvice: Advice = {
    location: location("src/cases.ts", 1, 1),
    level: "file",
    title: "probe advice",
    remediation: "act on the probe evidence",
    evidence: [{ measure: "probe", count: 4 }]
  }
  const adviceProbeWiring: Wiring = {
    checks: [throwProbeNamedCheck],
    derive: () => Stream.fromIterable([fixedAdvice])
  }

  const batches = await collectStream(
    pipe(Stream.fromIterable([update]), signalUpdates(adviceProbeWiring))
  )

  assert.equal(batches.length, 1)
  assert.equal(batches[0]?.length, 1)
  const [probeSignal] = batches[0] ?? []

  assert.ok(probeSignal, "expected the probe check to emit one signal")
  assert.equal(probeSignal.name, probeName)
  assert.equal(probeSignal.reported, true)
  assert.equal(probeSignal.detections.length, 4)

  const blockArrays = await collectStream(
    pipe(
      Stream.fromIterable([update]),
      signalUpdates(adviceProbeWiring),
      reportBlockUpdates(adviceProbeWiring)
    )
  )

  assert.equal(blockArrays.length, 1)

  const blocks = blockArrays[0]

  assert.equal(blocks.length, 2)
  assert.deepEqual(
    blocks[0].key,
    new AdviceReportKey({
      level: "file",
      path: "src/cases.ts",
      title: "probe advice"
    })
  )
  assert.equal(
    blocks[0].text.split("\n")[0],
    "src/cases.ts [file] — probe advice"
  )
  assert.deepEqual(
    blocks[1].key,
    new RuleReportKey({
      name: probeName,
      message: probeMessage,
      hint: probeHint
    })
  )
})

test("diffCheckableFiles reports initial files, quiet rediffs, and removals", async () => {
  const project = await loadFixtureProject()
  const context = contextFor(project.rootPath)(project.program)
  const emptyIndex = HashMap.empty<string, ts.SourceFile>()

  const [index, initial] = diffCheckableFiles(emptyIndex)(context)
  const changedNames = initial.changed
    .map((sourceFile) => path.basename(sourceFile.fileName))
    .sort()

  assert.deepEqual(changedNames, ["allowed.ts", "cases.ts"])
  assert.deepEqual(initial.removed, [])

  const [, rediffed] = diffCheckableFiles(index)(context)

  assert.deepEqual(rediffed.changed, [])
  assert.deepEqual(rediffed.removed, [])

  const [firstChanged] = initial.changed

  assert.ok(firstChanged, "expected the fixture to contain a checkable file")

  const phantomIndex = HashMap.set(index, "/gone.ts", firstChanged)
  const [, withPhantom] = diffCheckableFiles(phantomIndex)(context)

  assert.deepEqual(withPhantom.changed, [])
  assert.deepEqual(withPhantom.removed, ["/gone.ts"])
})

test("watch pushes the initial report, updated blocks, and cleared events for fs changes", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "watch-e2e-"))
  const casesPath = path.join(tempDir, "src", "cases.ts")

  await fs.cp(noThrowFixturePath, tempDir, { recursive: true })

  const workspace = await Effect.runPromise(discoverWorkspace(tempDir))
  const stream = watchReportFromWiring(probeWiring)(
    workspace,
    Option.some(pollingWatchOptions)
  )
  const originalText = await fs.readFile(casesPath, "utf8")
  const appendedLine = originalText.split("\n").length + 1

  await Effect.runPromise(
    Effect.gen(function* () {
      const queue = yield* Queue.unbounded<ReportEvent>()
      const consumer = yield* Effect.fork(
        Stream.runForEach(stream, (event) => Queue.offer(queue, event))
      )
      const take = pipe(Queue.take(queue), Effect.timeout("30 seconds"))

      const initial = yield* take

      assert.ok(
        initial._tag === "signal",
        "expected the initial report to arrive as a signal event"
      )
      assert.ok(
        initial.text.includes(probeMessage),
        "expected the initial block to carry the probe message"
      )
      assert.match(
        initial.text,
        /src\/cases\.ts:\d+:\d+/,
        "expected the initial block to carry source locations"
      )

      yield* Effect.promise(() => fs.appendFile(casesPath, '\nthrow "added"\n'))

      const updated = yield* take

      assert.ok(
        updated._tag === "signal",
        "expected the re-emitted block to arrive as a signal event"
      )
      assert.ok(
        updated.text.includes(`  src/cases.ts:${appendedLine}:1`),
        `expected the re-emitted block to carry the new location line ${appendedLine}`
      )

      yield* Effect.promise(() => fs.rm(casesPath))

      const cleared = yield* take

      assert.deepEqual(
        cleared,
        new ClearedEvent({
          key: new RuleReportKey({
            name: probeName,
            message: probeMessage,
            hint: probeHint
          }),
          text: `${probeName} — cleared: ${probeMessage}`
        })
      )

      yield* Fiber.interrupt(consumer)
    })
  )

  await fs.rm(tempDir, { recursive: true, force: true })
})

test("watch emits the empty-report event for a signal-free workspace", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "watch-empty-"))

  await fs.cp(noThrowFixturePath, tempDir, { recursive: true })
  await fs.rm(path.join(tempDir, "src", "cases.ts"))

  const workspace = await Effect.runPromise(discoverWorkspace(tempDir))
  const stream = watchReportFromWiring(probeWiring)(
    workspace,
    Option.some(pollingWatchOptions)
  )

  await Effect.runPromise(
    Effect.gen(function* () {
      const queue = yield* Queue.unbounded<ReportEvent>()
      const consumer = yield* Effect.fork(
        Stream.runForEach(stream, (event) => Queue.offer(queue, event))
      )
      const first = yield* pipe(Queue.take(queue), Effect.timeout("30 seconds"))

      assert.deepEqual(
        first,
        new EmptyReportEvent({ rootPath: workspace.rootPath })
      )

      yield* Fiber.interrupt(consumer)
    })
  )

  await fs.rm(tempDir, { recursive: true, force: true })
})
