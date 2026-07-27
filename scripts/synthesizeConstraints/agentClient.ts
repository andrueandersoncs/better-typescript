import { spawn, type ChildProcessByStdio, type StdioOptions } from "node:child_process"
import type { Readable, Writable } from "node:stream"
import { createHash } from "node:crypto"
import * as fs from "node:fs"
import * as path from "node:path"
import {
  Array,
  Console,
  Data,
  Deferred,
  Effect,
  Equivalence,
  Function,
  HashMap,
  Match,
  MutableRef,
  Option,
  Predicate,
  Queue,
  Ref,
  Result,
  Schema,
  Scope,
  Struct,
  SynchronizedRef,
  Tuple,
  flow,
  pipe
} from "effect"
import {
  RunOptions,
  StageError,
  StageOutcome,
  StageRecord,
  StageRequest,
  StageSpec,
  WorkerError,
  WorkerReply,
  type StageFailed,
  type StageSucceeded
} from "./data.ts"

// Worker is the Bun child because stdin and stdout are the only wire the client owns.
type Worker = ChildProcessByStdio<Writable, Readable, null>

// StageClient is the scoped generative seam because stages share one worker and one cache.
export class StageClient extends Data.Class<{
  readonly make: <A>(spec: StageSpec<A>) => Effect.Effect<A, StageError | WorkerError>
  readonly makeAll: <A>(
    specs: ReadonlyArray<StageSpec<A>>
  ) => Effect.Effect<ReadonlyArray<Result.Result<A, string>>>
  readonly records: Effect.Effect<ReadonlyArray<StageRecord>>
}> {}

// LineNotice carries one stdout line because the reader fiber decodes replies off a queue.
export const LineNotice = Schema.TaggedStruct("LineNotice", {
  text: Schema.String
})

export interface LineNotice extends Schema.Schema.Type<typeof LineNotice> {}

const exitCodeSchema = Schema.NullOr(Schema.Number)

// ExitNotice ends the worker stream because outstanding stages must not hang after exit.
export const ExitNotice = Schema.TaggedStruct("ExitNotice", {
  code: exitCodeSchema
})

export interface ExitNotice extends Schema.Schema.Type<typeof ExitNotice> {}

// SpawnFaultNotice fails readiness because a spawn fault never yields WorkerReady.
export const SpawnFaultNotice = Schema.TaggedStruct("SpawnFaultNotice", {
  message: Schema.String
})

export interface SpawnFaultNotice extends Schema.Schema.Type<typeof SpawnFaultNotice> {}

const wireNoticeMembers = Array.make(LineNotice, ExitNotice, SpawnFaultNotice)

// WireNotice is every child signal because one fiber owns readiness and stage settlement.
export const WireNotice = Schema.Union(wireNoticeMembers)

export type WireNotice = typeof WireNotice.Type

// PendingStages maps request ids to waiters because replies arrive unordered on one stream.
type PendingStages = HashMap.HashMap<string, Deferred.Deferred<WorkerReply, WorkerError>>

// MessageCarrier is a third-party error shape because Node callbacks only guarantee a message.
export const MessageCarrier = Schema.Struct({
  message: Schema.String
})

export interface MessageCarrier extends Schema.Schema.Type<typeof MessageCarrier> {}

type DataListener = (chunk: string) => void
type ExitListener = (code: number | null) => void
type ErrorListener = (error: MessageCarrier) => void

const strictEqualString = Equivalence.strictEqual<string>()
const strictEqualBoolean = Equivalence.strictEqual<boolean>()
const isEmptyString = (value: string) => strictEqualString(value, "")
const isTrue = (value: boolean) => strictEqualBoolean(value, true)
const isFalse = (value: boolean) => strictEqualBoolean(value, false)
const emptyRecords = Array.empty<StageRecord>()
const emptyPending = HashMap.empty<string, Deferred.Deferred<WorkerReply, WorkerError>>()
const noneWorker = Option.none<Worker>()
const noneReady = Option.none<Deferred.Deferred<void, WorkerError>>()
const emptyString = ""
const newline = "\n"
const bunCommand = "bun"
const pipeMode = "pipe"
const inheritMode = "inherit"
const workerStdio = Array.make(pipeMode, pipeMode, inheritMode) as unknown as StdioOptions
const increment = (value: number) => value + 1

const isNonEmptyText = (value: string) => {
  const length = value.length
  return length > 0
}

const isPresentLine = (line: string) => {
  const trimmed = line.trim()
  const empty = isEmptyString(trimmed)
  return isFalse(empty)
}

const isMessageCarrier = (cause: unknown): cause is MessageCarrier => {
  const hasMessage = Predicate.hasProperty(cause, "message")
  return hasMessage && Predicate.isString(cause.message)
}

const unknownText = (error: unknown) => {
  const fallbackText = String(error)

  return pipe(
    Option.liftPredicate(isMessageCarrier)(error),
    Option.map(Struct.get("message")),
    Option.filter(isNonEmptyText),
    Option.getOrElse(Function.constant(fallbackText))
  )
}

const makeWorkerError = (message: string) => new WorkerError({ message })

const makeStageError = (stage: string) => (message: string) => new StageError({ stage, message })

const stageErrorFromUnknown = (stage: string) => flow(unknownText, makeStageError(stage))

const prefixMessage = (prefix: string) => (message: string) => `${prefix}${message}`

const workerErrorWithPrefix = (prefix: string) =>
  flow(unknownText, prefixMessage(prefix), makeWorkerError)

const stageErrorWithPrefix = (stage: string) => (prefix: string) =>
  flow(unknownText, prefixMessage(prefix), makeStageError(stage))

const jsonSchemaOf = <A>(schema: Schema.Codec<A>) => {
  const document = Schema.toJsonSchemaDocument(schema, { additionalProperties: false })
  return document.schema
}

const hashCacheKey = (serialized: string) => {
  const hash = createHash("sha256")
  const updated = hash.update(serialized)
  const digest = updated.digest("hex")
  return digest.slice(0, 32)
}

const cacheKeyFor =
  <A>(options: RunOptions) =>
  (spec: StageSpec<A>) => {
    const schema = jsonSchemaOf(spec.schema)
    const systemPrompt = spec.systemPrompt
    const tools = spec.tools
    const task = spec.task
    const model = options.model
    const effort = options.effort
    const serialized = JSON.stringify({ systemPrompt, tools, schema, task, model, effort })
    return hashCacheKey(serialized)
  }

const cacheFileName = (cacheKey: string) => `${cacheKey}.json`

const cachePathFor = (options: RunOptions) => (cacheKey: string) => {
  const fileName = cacheFileName(cacheKey)
  return path.join(options.cacheDirectory, fileName)
}

const ensureCacheDirectory = (options: RunOptions) => {
  const directory = options.cacheDirectory
  const prefix = `Unable to create cache directory ${directory}: `

  return Effect.try({
    try: () => {
      fs.mkdirSync(directory, { recursive: true })
      return true as const
    },
    catch: workerErrorWithPrefix(prefix)
  })
}

const cacheFileExists = (cachePath: string) => Effect.sync(() => fs.existsSync(cachePath))

const readCacheText = (cachePath: string) => {
  const prefix = `Unable to read cache entry ${cachePath}: `

  return Effect.try({
    try: () => fs.readFileSync(cachePath, "utf8"),
    catch: stageErrorWithPrefix("cache")(prefix)
  })
}

const parseCacheJson = (cachePath: string) => (text: string) => {
  const prefix = `Unable to parse cache entry ${cachePath}: `

  return Effect.try({
    try: () => JSON.parse(text) as unknown,
    catch: stageErrorWithPrefix("cache")(prefix)
  })
}

const saveCacheEntry = (cachePath: string) => (outcome: StageOutcome) => {
  const prefix = `Unable to write cache entry ${cachePath}: `

  return Effect.try({
    try: () => {
      const body = JSON.stringify(outcome, null, 2)
      const text = `${body}\n`
      fs.writeFileSync(cachePath, text, "utf8")
    },
    catch: stageErrorWithPrefix("cache")(prefix)
  })
}

const asStagePayload =
  <A>(stage: string, schema: Schema.Codec<A>) =>
  (value: unknown) =>
    pipe(Schema.decodeUnknownEffect(schema)(value), Effect.mapError(stageErrorFromUnknown(stage)))

const asStageOutcome = (stage: string) => (value: unknown) =>
  pipe(
    Schema.decodeUnknownEffect(StageOutcome)(value),
    Effect.mapError(stageErrorFromUnknown(stage))
  )

const decodeWorkerReply = (value: unknown) => {
  const prefix = "Worker reply failed to decode: "

  return pipe(
    Schema.decodeUnknownEffect(WorkerReply)(value),
    Effect.mapError(flow(Struct.get("message"), prefixMessage(prefix), makeWorkerError))
  )
}

const parseWorkerLine = (text: string) => {
  const prefix = "Worker reply was not JSON: "

  return Effect.try({
    try: () => JSON.parse(text) as unknown,
    catch: workerErrorWithPrefix(prefix)
  })
}

const removeWorker = (worker: Worker) =>
  Effect.sync(() => {
    worker.stdin.end()
    worker.kill()
  })

const spawnWorkerProcess = (options: RunOptions) => {
  const prefix = "Failed to spawn agent worker: "
  const args = Array.make(options.workerPath)

  return Effect.try({
    try: () => {
      const child = spawn(bunCommand, args, {
        cwd: options.workingDirectory,
        stdio: workerStdio
      })

      return child as Worker
    },
    catch: workerErrorWithPrefix(prefix)
  })
}

const offerNotice = (notices: Queue.Queue<WireNotice>) => (notice: WireNotice) =>
  Queue.offer(notices, notice)

const runOffer = (notices: Queue.Queue<WireNotice>) => {
  const offer = offerNotice(notices)
  return flow(offer, Effect.runFork)
}

const splitStdoutChunk = (pending: MutableRef.MutableRef<string>) => (chunk: string) => {
  const prior = MutableRef.get(pending)
  const combined = `${prior}${chunk}`
  const parts = combined.split(newline)
  const segments = Array.fromIterable(parts)
  const rest = pipe(Array.last(segments), Option.getOrElse(Function.constant(emptyString)))
  MutableRef.set(pending, rest)
  return Array.dropRight(segments, 1)
}

const makeLineNotice = (text: string) => LineNotice.make({ text })
const makeExitNotice = (code: number | null) => ExitNotice.make({ code })
const makeSpawnFaultNotice = (message: string) => SpawnFaultNotice.make({ message })

const attachWorkerNotices = (notices: Queue.Queue<WireNotice>) => (worker: Worker) => {
  const publish = runOffer(notices)
  const pending = MutableRef.make(emptyString)
  const linesFrom = splitStdoutChunk(pending)
  const publishLine = flow(makeLineNotice, publish)
  const presentLines = (lines: ReadonlyArray<string>) => Array.filter(lines, isPresentLine)
  const publishPresentLines = flow(presentLines, Array.map(publishLine))
  const onData: DataListener = flow(linesFrom, publishPresentLines)
  const onExit: ExitListener = flow(makeExitNotice, publish)

  const spawnFaultFromError = flow(
    Struct.get<MessageCarrier, "message">("message"),
    makeSpawnFaultNotice
  )

  const onError: ErrorListener = flow(spawnFaultFromError, publish)
  worker.stdout.setEncoding("utf8")
  worker.stdout.on("data", onData)
  worker.on("exit", onExit)
  worker.on("error", onError)
  return true as const
}

const pairUnchanged = (current: PendingStages) => Tuple.make(false, current)
const succeedUnchangedPending = flow(pairUnchanged, Effect.succeed)

const removePendingAfterSuccess =
  (id: string) =>
  (reply: WorkerReply) =>
  (deferred: Deferred.Deferred<WorkerReply, WorkerError>) =>
  (current: PendingStages) =>
    pipe(
      Deferred.succeed(deferred, reply),
      Effect.map(() => {
        const next = HashMap.remove(current, id)
        return Tuple.make(true, next)
      })
    )

const setPendingReply =
  (pending: SynchronizedRef.SynchronizedRef<PendingStages>) =>
  (id: string) =>
  (reply: WorkerReply) =>
    pipe(
      SynchronizedRef.modifyEffect(pending, (current) => {
        const found = HashMap.get(current, id)
        const removeFound = removePendingAfterSuccess(id)(reply)

        return Option.match(found, {
          onNone: () => succeedUnchangedPending(current),
          onSome: Function.flip(removeFound)(current)
        })
      }),
      Effect.asVoid
    )

const failDeferred =
  (error: WorkerError) => (deferred: Deferred.Deferred<WorkerReply, WorkerError>) =>
    Deferred.fail(deferred, error)

const removePending =
  (pending: SynchronizedRef.SynchronizedRef<PendingStages>) => (error: WorkerError) =>
    SynchronizedRef.modifyEffect(pending, (current) => {
      const values = HashMap.values(current)
      const deferreds = Array.fromIterable(values)
      const failOne = failDeferred(error)
      const cleared = Tuple.make(undefined, emptyPending)
      return pipe(Effect.forEach(deferreds, failOne), Effect.as(cleared))
    })

const setSucceededReply =
  (pending: SynchronizedRef.SynchronizedRef<PendingStages>) =>
  (reply: WorkerReply) =>
  (succeeded: StageSucceeded) =>
    pipe(setPendingReply(pending)(succeeded.id)(reply), Effect.asVoid)

const setFailedReply =
  (pending: SynchronizedRef.SynchronizedRef<PendingStages>) =>
  (reply: WorkerReply) =>
  (failed: StageFailed) =>
    pipe(setPendingReply(pending)(failed.id)(reply), Effect.asVoid)

const discardWorkerReady = Function.constant(Effect.void)

const setStageReply =
  (pending: SynchronizedRef.SynchronizedRef<PendingStages>) => (reply: WorkerReply) =>
    pipe(
      Match.value(reply),
      Match.tag("WorkerReady", discardWorkerReady),
      Match.tag("StageSucceeded", setSucceededReply(pending)(reply)),
      Match.tag("StageFailed", setFailedReply(pending)(reply)),
      Match.exhaustive
    )

const setReadyOpen = (ready: Deferred.Deferred<void, WorkerError>) => (opened: Ref.Ref<boolean>) =>
  Effect.fn("AgentClient.setReadyOpen")(function* () {
    const alreadyOpen = yield* Ref.get(opened)

    if (isTrue(alreadyOpen)) {
      return
    }

    yield* Ref.set(opened, true)
    yield* Deferred.succeed(ready, undefined)
  })()

const handleLineNotice = Effect.fn("AgentClient.handleLineNotice")(function* (
  ready: Deferred.Deferred<void, WorkerError>,
  pending: SynchronizedRef.SynchronizedRef<PendingStages>,
  opened: Ref.Ref<boolean>,
  notice: LineNotice
) {
  const raw = yield* pipe(parseWorkerLine(notice.text), Effect.option)

  if (Option.isNone(raw)) {
    return
  }

  const reply = yield* pipe(decodeWorkerReply(raw.value), Effect.option)

  if (Option.isNone(reply)) {
    return
  }

  const tag = reply.value._tag
  const isReady = strictEqualString(tag, "WorkerReady")

  if (isReady) {
    yield* setReadyOpen(ready)(opened)
    return
  }

  yield* setStageReply(pending)(reply.value)
})

const nullCodeText = "null"

const workerExitMessage = (code: number | null) => {
  const codeOption = Option.fromNullishOr(code)

  const codeText = Option.match(codeOption, {
    onNone: Function.constant(nullCodeText),
    onSome: String
  })

  return `Agent worker exited with code ${codeText} before ready.`
}

const workerExitError = flow(workerExitMessage, makeWorkerError)
const workerGoneError = makeWorkerError("worker exited")

const handleExitNotice = Effect.fn("AgentClient.handleExitNotice")(function* (
  ready: Deferred.Deferred<void, WorkerError>,
  pending: SynchronizedRef.SynchronizedRef<PendingStages>,
  opened: Ref.Ref<boolean>,
  notice: ExitNotice
) {
  const alreadyOpen = yield* Ref.get(opened)
  const clear = removePending(pending)

  if (isTrue(alreadyOpen)) {
    yield* clear(workerGoneError)
    return
  }

  const error = workerExitError(notice.code)
  yield* Deferred.fail(ready, error)
  yield* clear(error)
})

const handleSpawnFault = Effect.fn("AgentClient.handleSpawnFault")(function* (
  ready: Deferred.Deferred<void, WorkerError>,
  pending: SynchronizedRef.SynchronizedRef<PendingStages>,
  notice: SpawnFaultNotice
) {
  const error = makeWorkerError(notice.message)
  yield* Deferred.fail(ready, error)
  yield* removePending(pending)(error)
})

const setWireNotice = (
  ready: Deferred.Deferred<void, WorkerError>,
  pending: SynchronizedRef.SynchronizedRef<PendingStages>,
  opened: Ref.Ref<boolean>
) => {
  const onLineNotice = (line: LineNotice) => handleLineNotice(ready, pending, opened, line)
  const onExitNotice = (exit: ExitNotice) => handleExitNotice(ready, pending, opened, exit)
  const onSpawnFault = (fault: SpawnFaultNotice) => handleSpawnFault(ready, pending, fault)

  const setNotice = (notice: WireNotice) =>
    pipe(
      Match.value(notice),
      Match.tag("LineNotice", onLineNotice),
      Match.tag("ExitNotice", onExitNotice),
      Match.tag("SpawnFaultNotice", onSpawnFault),
      Match.exhaustive
    )

  return setNotice
}

const runWireLoop = Effect.fn("AgentClient.runWireLoop")(function* (
  notices: Queue.Queue<WireNotice>,
  ready: Deferred.Deferred<void, WorkerError>,
  pending: SynchronizedRef.SynchronizedRef<PendingStages>
) {
  const opened = yield* Ref.make(false)
  const setNotice = setWireNotice(ready, pending, opened)

  const step = Effect.gen(function* () {
    const notice = yield* Queue.take(notices)
    yield* setNotice(notice)
  })

  return yield* Effect.forever(step)
})

const sendStageRequest = (worker: Worker) => (request: StageRequest) => {
  const prefix = "Failed to write stage request: "

  return Effect.try({
    try: () => {
      const serialized = JSON.stringify(request)
      const line = `${serialized}\n`
      worker.stdin.write(line)
    },
    catch: workerErrorWithPrefix(prefix)
  })
}

const setPendingDeferreds =
  (pending: SynchronizedRef.SynchronizedRef<PendingStages>) =>
  (id: string) =>
  (deferred: Deferred.Deferred<WorkerReply, WorkerError>) => {
    const withDeferreds = (current: PendingStages) => HashMap.set(current, id, deferred)
    return SynchronizedRef.update(pending, withDeferreds)
  }

const stageErrorFromFailed = (stage: string) =>
  flow(Struct.get<StageFailed, "error">("error"), makeStageError(stage))

const unexpectedReadyMessage = "Worker emitted WorkerReady after the stream was already open."

const unexpectedReadyError = Function.flip(makeStageError)(unexpectedReadyMessage)

const failUnexpectedReady = flow(unexpectedReadyError, Effect.fail)

const succeedOutcome = flow(Struct.get<StageSucceeded, "outcome">("outcome"), Effect.succeed)

const interpretStageReply = (stage: string) => (reply: WorkerReply) => {
  const failReady = () => failUnexpectedReady(stage)

  return pipe(
    Match.value(reply),
    Match.tag("StageSucceeded", succeedOutcome),
    Match.tag("StageFailed", flow(stageErrorFromFailed(stage), Effect.fail)),
    Match.tag("WorkerReady", failReady),
    Match.exhaustive
  )
}

const nextRequestId = (counter: Ref.Ref<number>) =>
  Ref.modify(counter, (current) => {
    const next = increment(current)
    const id = `stage-${next}`
    return Tuple.make(id, next)
  })

const appendRecord = (records: Ref.Ref<ReadonlyArray<StageRecord>>) => (record: StageRecord) => {
  const withRecord = (current: ReadonlyArray<StageRecord>) => Array.append(current, record)
  return Ref.update(records, withRecord)
}

const makeCachedRecord = (stage: string) => (cacheKey: string) => (outcome: StageOutcome) =>
  StageRecord.make({
    stage,
    cacheKey,
    cached: true,
    requests: outcome.requests,
    tokens: outcome.tokens
  })

const makeFreshRecord = (stage: string) => (cacheKey: string) => (outcome: StageOutcome) =>
  StageRecord.make({
    stage,
    cacheKey,
    cached: false,
    requests: outcome.requests,
    tokens: outcome.tokens
  })

const writeCachedProgress = (stage: string) => Console.error(`cached  ${stage}`)
const writeExecuteProgress = (stage: string) => Console.error(`run     ${stage}`)

const writeDoneProgress = (stage: string) => (requests: number) =>
  Console.error(`done    ${stage} (${requests} requests)`)

const writeFailedProgress = (stage: string) => Console.error(`failed  ${stage}`)

export const makeStageClient: (
  options: RunOptions
) => Effect.Effect<StageClient, never, Scope.Scope> = Effect.fn("AgentClient.makeStageClient")(
  function* (options: RunOptions) {
    yield* pipe(ensureCacheDirectory(options), Effect.orDie)

    const records = yield* Ref.make<ReadonlyArray<StageRecord>>(emptyRecords)
    const counter = yield* Ref.make(0)
    const pending = yield* SynchronizedRef.make(emptyPending)
    const workerCell = yield* Ref.make(noneWorker)
    const readyCell = yield* Ref.make(noneReady)
    const scope = yield* Effect.scope

    const shutdown = Effect.fn("AgentClient.shutdown")(function* () {
      const current = yield* Ref.get(workerCell)

      if (Option.isNone(current)) {
        return
      }

      yield* removeWorker(current.value)
    })

    yield* Effect.addFinalizer(() => shutdown())

    const startWorker = Effect.fn("AgentClient.startWorker")(function* () {
      const currentWorker = yield* Ref.get(workerCell)

      if (Option.isSome(currentWorker)) {
        const currentReady = yield* Ref.get(readyCell)
        const ready = Option.getOrThrow(currentReady)
        return Tuple.make(currentWorker.value, ready)
      }

      const ready = yield* Deferred.make<void, WorkerError>()
      const worker = yield* spawnWorkerProcess(options)
      const notices = yield* Queue.unbounded<WireNotice>()
      const attach = attachWorkerNotices(notices)
      yield* Effect.sync(() => attach(worker))
      yield* pipe(runWireLoop(notices, ready, pending), Effect.forkIn(scope))
      const someWorker = Option.some(worker)
      const someReady = Option.some(ready)
      yield* Ref.set(workerCell, someWorker)
      yield* Ref.set(readyCell, someReady)
      return Tuple.make(worker, ready)
    })

    const ensureWorker = Effect.fn("AgentClient.ensureWorker")(function* () {
      const started = yield* startWorker()
      const worker = Tuple.get(started, 0)
      const ready = Tuple.get(started, 1)
      yield* Deferred.await(ready)
      return worker
    })

    const dispatch = Effect.fn("AgentClient.dispatch")(function* <A>(spec: StageSpec<A>) {
      const worker = yield* ensureWorker()
      const id = yield* nextRequestId(counter)
      const deferred = yield* Deferred.make<WorkerReply, WorkerError>()
      yield* setPendingDeferreds(pending)(id)(deferred)
      const jsonSchema = jsonSchemaOf(spec.schema)

      const request = StageRequest.make({
        id,
        stage: spec.stage,
        systemPrompt: spec.systemPrompt,
        tools: spec.tools,
        jsonSchema,
        task: spec.task,
        model: options.model,
        effort: options.effort,
        maxRuntimeMs: options.maxRuntimeMs,
        workingDirectory: options.workingDirectory
      })

      yield* sendStageRequest(worker)(request)
      const reply = yield* Deferred.await(deferred)
      return yield* interpretStageReply(spec.stage)(reply)
    })

    const readCachedOutcome = Effect.fn("AgentClient.readCachedOutcome")(function* <A>(
      spec: StageSpec<A>,
      cachePath: string
    ) {
      const text = yield* readCacheText(cachePath)
      const raw = yield* parseCacheJson(cachePath)(text)
      const outcome = yield* asStageOutcome(spec.stage)(raw)
      const data = yield* asStagePayload(spec.stage, spec.schema)(outcome.data)
      return Tuple.make(outcome, data)
    })

    const makeOne = Effect.fn("AgentClient.make")(function* <A>(spec: StageSpec<A>) {
      const cacheKey = cacheKeyFor(options)(spec)
      const cachePath = cachePathFor(options)(cacheKey)
      const refresh = options.refresh
      const exists = yield* cacheFileExists(cachePath)
      const skipCache = refresh
      const useCache = isFalse(skipCache) && exists

      if (useCache) {
        const cached = yield* readCachedOutcome(spec, cachePath)
        const outcome = Tuple.get(cached, 0)
        const data = Tuple.get(cached, 1)
        const record = makeCachedRecord(spec.stage)(cacheKey)(outcome)
        yield* appendRecord(records)(record)
        yield* writeCachedProgress(spec.stage)
        return data
      }

      yield* writeExecuteProgress(spec.stage)
      const outcome = yield* dispatch(spec)
      const data = yield* asStagePayload(spec.stage, spec.schema)(outcome.data)
      yield* saveCacheEntry(cachePath)(outcome)
      const record = makeFreshRecord(spec.stage)(cacheKey)(outcome)
      yield* appendRecord(records)(record)
      yield* writeDoneProgress(spec.stage)(outcome.requests)
      return data
    })

    const settleFailure = (stage: string) => (error: StageError | WorkerError) => {
      const message = error.message
      const failed = Result.fail(message)
      return pipe(writeFailedProgress(stage), Effect.as(failed))
    }

    const settleOne = Effect.fn("AgentClient.settleOne")(function* <A>(spec: StageSpec<A>) {
      const outcome = yield* pipe(makeOne(spec), Effect.result)

      return yield* Result.match(outcome, {
        onSuccess: flow(Result.succeed, Effect.succeed),
        onFailure: settleFailure(spec.stage)
      })
    })

    const makeAll = Effect.fn("AgentClient.makeAll")(function* <A>(
      specs: ReadonlyArray<StageSpec<A>>
    ) {
      const concurrency = options.concurrency
      return yield* Effect.forEach(specs, settleOne, { concurrency })
    })

    const recordsEffect = Effect.fn("AgentClient.listRecords")(function* () {
      return yield* Ref.get(records)
    })()

    return new StageClient({
      make: makeOne,
      makeAll,
      records: recordsEffect
    })
  }
)
