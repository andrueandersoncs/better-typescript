import { execFileSync } from "node:child_process"
import { realpathSync } from "node:fs"
import * as path from "node:path"
import { pathToFileURL } from "node:url"
import {
  Array,
  Effect,
  Equivalence,
  Function,
  Option,
  Result,
  Schema,
  Stream,
  Struct,
  pipe
} from "effect"
import {
  StageFailed,
  StageOutcome,
  StageRequest,
  StageSucceeded,
  WorkerReady,
  type WorkerReply
} from "./data.ts"

// Bun is the runtime global because this worker only loads under Bun's resolver.
declare const Bun: {
  readonly resolveSync: (specifier: string, parent: string) => string
}

// ExecutorModule is the SDK boundary because only runSubprocess crosses into the agent runtime.
interface ExecutorModule {
  readonly runSubprocess: (options: unknown) => Promise<unknown>
}

const stringSchema = Schema.String
const unknownSchema = Schema.Unknown
const numberSchema = Schema.Number
const optionalUnknown = Schema.OptionFromOptionalKey(unknownSchema)
const optionalString = Schema.OptionFromOptionalKey(stringSchema)
const stringArraySchema = Schema.Array(stringSchema)

// StructuredOutput is the SDK payload envelope because status and data decide the reply tag.
export const StructuredOutput = Schema.Struct({
  status: stringSchema,
  data: optionalUnknown,
  error: optionalString
})

export interface StructuredOutput extends Schema.Schema.Type<typeof StructuredOutput> {}

const optionalStructuredOutput = Schema.OptionFromOptionalKey(StructuredOutput)

// SubprocessResult is the SDK return shape because the worker maps it onto WorkerReply.
export const SubprocessResult = Schema.Struct({
  stderr: stringSchema,
  error: optionalString,
  requests: numberSchema,
  tokens: numberSchema,
  structuredOutput: optionalStructuredOutput
})

export interface SubprocessResult extends Schema.Schema.Type<typeof SubprocessResult> {}

const projectSource = Schema.Literal("project")
const strictMode = Schema.Literal("strict")
const callerSource = Schema.Literal("caller")

// AgentConfig is the SDK agent record because runSubprocess owns that nested shape.
export const AgentConfig = Schema.Struct({
  name: stringSchema,
  description: stringSchema,
  systemPrompt: stringSchema,
  tools: stringArraySchema,
  spawns: stringArraySchema,
  model: stringArraySchema,
  source: projectSource
})

export interface AgentConfig extends Schema.Schema.Type<typeof AgentConfig> {}

// SubprocessOptions is the SDK call bag because the worker must not invent a second option model.
export const SubprocessOptions = Schema.Struct({
  cwd: stringSchema,
  agent: AgentConfig,
  task: stringSchema,
  index: numberSchema,
  id: stringSchema,
  modelOverride: stringSchema,
  effort: stringSchema,
  outputSchema: unknownSchema,
  outputSchemaMode: strictMode,
  outputSchemaSource: callerSource,
  outputSchemaOverridesAgent: Schema.Boolean,
  restrictToolNames: Schema.Boolean,
  enableLsp: Schema.Boolean,
  enableMCP: Schema.Boolean,
  enableIrc: Schema.Boolean,
  keepAlive: Schema.Boolean,
  persistArtifacts: Schema.Boolean,
  maxRuntimeMs: numberSchema
})

export interface SubprocessOptions extends Schema.Schema.Type<typeof SubprocessOptions> {}

const decodeStageRequest = Schema.decodeUnknownEffect(StageRequest)
const decodeSubprocessResult = Schema.decodeUnknownEffect(SubprocessResult)
const strictStringEqual = Equivalence.strictEqual<string>()
const ompCommand = Array.make("omp")
const emptySpawns = Array.empty<string>()
const absentStatus = Function.constant("absent")
const identityError = (error: unknown) => error

const hasText = (value: string) => value.length > 0

const trimLine = (line: string) => line.trim()

const isNonEmptyRequestLine = Function.flow(trimLine, hasText)

const truncateDetail = (text: string) => text.slice(0, 800)

const writeReply = (reply: WorkerReply) =>
  Effect.sync(() => {
    const encoded = JSON.stringify(reply)
    const line = `${encoded}\n`

    process.stdout.write(line)

    return line
  })

const parseJsonLine = (line: string) =>
  Effect.try({
    try: () => JSON.parse(line) as unknown,
    catch: identityError
  })

const resolveLocalPackageRoot = Effect.fn("AgentWorker.resolveLocalPackageRoot")(function* () {
  const workingDirectory = process.cwd()

  const packageJsonPath = yield* Effect.try({
    try: () => Bun.resolveSync("@oh-my-pi/pi-coding-agent/package.json", workingDirectory),
    catch: identityError
  })

  return path.dirname(packageJsonPath)
})

const resolveGlobalPackageRoot = Effect.fn("AgentWorker.resolveGlobalPackageRoot")(function* () {
  const whichOutput = yield* Effect.try({
    try: () => execFileSync("which", ompCommand, { encoding: "utf8" }),
    catch: identityError
  })

  const whichPath = whichOutput.trim()
  const realPath = realpathSync(whichPath)
  const binDirectory = path.dirname(realPath)

  return path.resolve(binDirectory, "..")
})

const resolvePackageRoot = Effect.fn("AgentWorker.resolvePackageRoot")(function* () {
  const localAttempt = resolveLocalPackageRoot()
  const localRoot = yield* Effect.option(localAttempt)

  return yield* Option.match(localRoot, {
    onNone: resolveGlobalPackageRoot,
    onSome: Effect.succeed
  })
})

const loadExecutorModule = Effect.fn("AgentWorker.loadExecutorModule")(function* () {
  const root = yield* resolvePackageRoot()
  const resolved = Bun.resolveSync("@oh-my-pi/pi-coding-agent/task/executor", root)
  const moduleUrl = pathToFileURL(resolved)
  const href = moduleUrl.href

  const loaded = yield* Effect.tryPromise({
    try: () => import(href) as Promise<ExecutorModule>,
    catch: identityError
  })

  return loaded
})

const makeSubprocessOptions = (request: StageRequest) => {
  const agentName = request.stage.replace(/[^\p{L}\p{N}]+/gu, "-")
  const description = `Synthesis stage ${request.stage}.`
  const tools = Array.fromIterable(request.tools)
  const model = Array.make(request.model)

  const agent = AgentConfig.make({
    name: agentName,
    description,
    systemPrompt: request.systemPrompt,
    tools,
    spawns: emptySpawns,
    model,
    source: "project"
  })

  return SubprocessOptions.make({
    cwd: request.workingDirectory,
    agent,
    task: request.task,
    index: 0,
    id: request.id,
    modelOverride: request.model,
    effort: request.effort,
    outputSchema: request.jsonSchema,
    outputSchemaMode: "strict",
    outputSchemaSource: "caller",
    outputSchemaOverridesAgent: true,
    restrictToolNames: true,
    enableLsp: false,
    enableMCP: false,
    enableIrc: false,
    keepAlive: false,
    persistArtifacts: false,
    maxRuntimeMs: request.maxRuntimeMs
  })
}

const executeStage = (executor: ExecutorModule) => (request: StageRequest) => {
  const options = makeSubprocessOptions(request)

  const ran = Effect.tryPromise({
    try: () => executor.runSubprocess(options),
    catch: identityError
  })

  return pipe(ran, Effect.flatMap(decodeSubprocessResult))
}

const detailFromResult = (result: SubprocessResult) => {
  const structuredError = pipe(
    result.structuredOutput,
    Option.map(Struct.get("error")),
    Option.flatten
  )

  const withResultError = Option.orElse(structuredError, Function.constant(result.error))
  const stderrDetail = truncateDetail(result.stderr)

  return Option.getOrElse(withResultError, Function.constant(stderrDetail))
}

const makeInvalidFailure = (request: StageRequest) => (result: SubprocessResult) => {
  const status = pipe(
    result.structuredOutput,
    Option.map(Struct.get("status")),
    Option.getOrElse(absentStatus)
  )

  const prefix = `stage ${request.stage} produced no valid payload`
  const statusPart = `status=${status}`
  const detail = detailFromResult(result)
  const parts = Array.make(prefix, statusPart, detail)
  const nonEmpty = Array.filter(parts, hasText)
  const error = Array.join(nonEmpty, "; ")

  return StageFailed.make({
    id: request.id,
    error
  })
}

const makeThrownFailure = (request: StageRequest) => (error: unknown) => {
  const message = `stage ${request.stage} threw: ${String(error)}`

  return StageFailed.make({
    id: request.id,
    error: message
  })
}

const hasValidStatus = (output: StructuredOutput) => strictStringEqual(output.status, "valid")

const makeSucceeded = (request: StageRequest) => (result: SubprocessResult) => (data: unknown) => {
  const outcome = StageOutcome.make({
    data,
    requests: result.requests,
    tokens: result.tokens
  })

  return StageSucceeded.make({
    id: request.id,
    outcome
  })
}

const buildSucceededOrFailed = (request: StageRequest) => (result: SubprocessResult) => {
  const validData = pipe(
    result.structuredOutput,
    Option.filter(hasValidStatus),
    Option.flatMap(Struct.get("data"))
  )

  const succeeded = makeSucceeded(request)(result)
  const failed = makeInvalidFailure(request)(result)

  return Option.match(validData, {
    onNone: Function.constant(failed),
    onSome: succeeded
  })
}

const buildStageReply = (executor: ExecutorModule) =>
  Effect.fn("AgentWorker.buildStageReply")(function* (request: StageRequest) {
    const stageEffect = executeStage(executor)(request)
    const exit = yield* Effect.result(stageEffect)
    const onFailure = makeThrownFailure(request)
    const onSuccess = buildSucceededOrFailed(request)

    return Result.match(exit, {
      onFailure,
      onSuccess
    })
  })

const encodeStdinChunks = Effect.sync(() => {
  process.stdin.setEncoding("utf8")

  return process.stdin as AsyncIterable<string>
})

const streamFromChunks = (chunks: AsyncIterable<string>) =>
  Stream.fromAsyncIterable(chunks, identityError)

const stdinChunkStream = pipe(encodeStdinChunks, Effect.map(streamFromChunks), Stream.unwrap)

const stdinLines = pipe(stdinChunkStream, Stream.splitLines, Stream.filter(isNonEmptyRequestLine))

const writeRequestLine = (executor: ExecutorModule) =>
  Effect.fn("AgentWorker.writeRequestLine")(function* (line: string) {
    const json = yield* parseJsonLine(line)
    const request = yield* decodeStageRequest(json)
    const buildReply = buildStageReply(executor)
    const reply = yield* buildReply(request)

    yield* writeReply(reply)
  })

const writeRequestLineOrSkip = (executor: ExecutorModule) =>
  Function.flow(writeRequestLine(executor), Effect.ignore)

const runWorker = Effect.fn("AgentWorker.runWorker")(function* () {
  const executor = yield* loadExecutorModule()
  const ready = WorkerReady.make({})

  yield* writeReply(ready)

  const writeLine = writeRequestLineOrSkip(executor)

  yield* pipe(
    stdinLines,
    Stream.mapEffect(writeLine, { concurrency: "unbounded", unordered: true }),
    Stream.runDrain
  )
})

const workerProgram = runWorker()

Effect.runFork(workerProgram)
