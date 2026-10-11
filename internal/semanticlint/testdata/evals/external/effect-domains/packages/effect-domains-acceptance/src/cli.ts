import { Array, Config, Console, DateTime, Effect, Equal, Function, Layer, Option, Predicate, Record, Schema, String, flow, pipe } from "effect"
import { join, resolve } from "node:path"
import { AcceptanceError, type FixtureRuntime, type InputCandidates, type RequirementEvaluation, type RunEvidence } from "./model.ts"
import { type AcceptanceDefinition, RunConfiguration, runAcceptance, runFaults } from "./runner.ts"
import { calibrate, summaryLine } from "./calibration.ts"

const MinimumConfidenceSchema = Schema.NumberFromString.check(Schema.isGreaterThanOrEqualTo(0), Schema.isLessThanOrEqualTo(1))
const MaxActionsSchema = Schema.NumberFromString.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(1), Schema.isLessThanOrEqualTo(100))
const DeadlineSecondsSchema = Schema.NumberFromString.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(1), Schema.isLessThanOrEqualTo(600))
const SeedSchema = Schema.NumberFromString.check(Schema.isInt())
const ReplayPathSchema = Schema.OptionFromUndefinedOr(Schema.NonEmptyString)
const FaultIdSchema = Schema.OptionFromUndefinedOr(Schema.NonEmptyString)

class CommandLine extends Schema.Class<CommandLine>("CommandLine")({
  output: Schema.NonEmptyString,
  seed: SeedSchema,
  model: Schema.NonEmptyString,
  minimumConfidence: MinimumConfidenceSchema,
  maxActions: MaxActionsSchema,
  deadlineSeconds: DeadlineSecondsSchema,
  replay: ReplayPathSchema,
  fault: FaultIdSchema,
}) {}

const EncodedCommandLineSchema = Schema.toEncoded(CommandLine)

const acceptanceOptions = ["--output", "--seed", "--model", "--minimum-confidence", "--max-actions", "--deadline-seconds", "--replay", "--fault"]

const calibrationOptions = ["--corpora", "--models", "--output", "--minimum-confidence"]

/** Command-line failures share one boundary because every acceptance command reports configuration errors the same way. */
export const configurationFailure = (message: string) => AcceptanceError.make({ boundary: "configuration", message })

const optionMessage = (name: string) => `Unknown, repeated, or incomplete option ${name}`

const rejectOption = flow(optionMessage, configurationFailure, Effect.fail)

const accepted = (options: Record<string, string>, name: string) => (present: string) => pipe(options, Record.set(name, present), Effect.succeed)

const addOption = (allowed: ReadonlyArray<string>) => (options: Record<string, string>, pair: Array.NonEmptyReadonlyArray<string>) => {
  const name = Array.headNonEmpty(pair)
  const value = pipe(pair, Array.get(1), Option.filter(String.isNonEmpty))
  const known = Array.contains(allowed, name)
  const fresh = !Record.has(options, name)
  const acceptable = known && fresh
  const accept = accepted(options, name)
  const rejection = rejectOption(name)
  const reject = Function.constant(rejection)

  return acceptable ? Option.match(value, { onNone: reject, onSome: accept }) : reject()
}

/** Options are name/value pairs shared by every acceptance command because repeated, unknown, or incomplete options must fail identically. */
export const parseOptions = Effect.fn("Acceptance.parseOptions")(function* (allowed: ReadonlyArray<string>, args: ReadonlyArray<string>) {
  const pairs = Array.chunksOf(args, 2)

  return yield* Effect.reduce(pairs, Record.empty<string, string>, addOption(allowed))
})

const optionOr = (options: Record<string, string>, fallback: string) => (name: string) => pipe(options, Record.get(name), Option.getOrElse(Function.constant(fallback)))

const defaultOutput = Effect.fn("Acceptance.defaultOutput")(function* () {
  const root = new URL("../../../", import.meta.url).pathname
  const now = yield* DateTime.now
  const stamp = pipe(now, DateTime.formatIso, String.replace(/[:.]/g, "-"))
  const identifier = yield* Effect.sync(() => crypto.randomUUID())

  return join(root, "data", "acceptance", `${stamp}-${identifier}`)
})

const configurationError = (error: Schema.SchemaError) => configurationFailure(`${error}`)

const readConfiguration = Effect.fn("Acceptance.readConfiguration")(function* (definition: AcceptanceDefinition, args: ReadonlyArray<string>, repairLocators: boolean) {
  const options = yield* parseOptions(acceptanceOptions, args)
  const fallbackOutput = yield* defaultOutput()
  const output = pipe(options, Record.get("--output"), Option.map(resolve), Option.getOrElse(Function.constant(fallbackOutput)))
  const replay = pipe(options, Record.get("--replay"), Option.map(resolve))

  const encoded = EncodedCommandLineSchema.make({
    output,
    seed: optionOr(options, "42")("--seed"),
    model: optionOr(options, "jev-1.13.0")("--model"),
    minimumConfidence: optionOr(options, "0.55")("--minimum-confidence"),
    maxActions: optionOr(options, `${definition.defaultMaxActions}`)("--max-actions"),
    deadlineSeconds: optionOr(options, "180")("--deadline-seconds"),
    replay: Option.getOrUndefined(replay),
    fault: pipe(options, Record.get("--fault"), Option.getOrUndefined),
  })

  const commandLine = yield* pipe(encoded, Schema.decodeUnknownEffect(CommandLine), Effect.mapError(configurationError))
  const apiKey = yield* pipe(Config.redacted("TYPESAFE_API_KEY"), Config.option)

  return RunConfiguration.make({
    output: commandLine.output,
    seed: commandLine.seed,
    model: commandLine.model,
    minimumConfidence: commandLine.minimumConfidence,
    maxActions: commandLine.maxActions,
    deadlineSeconds: commandLine.deadlineSeconds,
    replay: commandLine.replay,
    repairLocators,
    fault: commandLine.fault,
    apiKey,
  })
})

const setExitCode = (passed: boolean) =>
  Effect.sync(() => {
    process.exitCode = passed ? 0 : 1
  })

const failedExit = setExitCode(false)

const describeError = (error: unknown) => `${error}`

/** Failures print and set a nonzero exit code because every acceptance command is scripted by exit status. */
export const reportFailure = Effect.fn("Acceptance.reportFailure")(function* (error: unknown) {
  const message = describeError(error)

  yield* Console.error(message)
  yield* failedExit
})

const faultsFlag = "--faults"

const isFaultsFlag = (arg: string) => Equal.equals(arg, faultsFlag)

const repairFlag = "--repair-locators"

const isRepairFlag = (arg: string) => Equal.equals(arg, repairFlag)

const isModeFlag = Predicate.or(isFaultsFlag, isRepairFlag)

const exploreFaults = Effect.fn("Acceptance.faults.main")(function* (definition: AcceptanceDefinition, args: ReadonlyArray<string>) {
  const configuration = yield* readConfiguration(definition, args, false)
  const passed = yield* runFaults(definition, configuration)

  yield* setExitCode(passed)
})

const explore = Effect.fn("Acceptance.explore")(function* (definition: AcceptanceDefinition, args: ReadonlyArray<string>, repairLocators: boolean) {
  const configuration = yield* readConfiguration(definition, args, repairLocators)
  const passed = yield* runAcceptance(definition, configuration)

  yield* setExitCode(passed)
})

// --faults and --repair-locators are flags rather than option pairs because they select the mode, not a value.
const acceptance = (definition: AcceptanceDefinition, args: ReadonlyArray<string>) => {
  const faults = Array.some(args, isFaultsFlag)
  const repairLocators = Array.some(args, isRepairFlag)
  const options = Array.filter(args, Predicate.not(isModeFlag))

  return faults ? exploreFaults(definition, options) : explore(definition, options, repairLocators)
}

type AcceptanceServices = RunEvidence | FixtureRuntime | InputCandidates | RequirementEvaluation

const commandLine = Effect.sync(() => process.argv)

/** The command line is shared because every application exposes the same options, key handling, and exit code. */
export const runAcceptanceCli = Effect.fn("Acceptance.runCli")(function* (definition: AcceptanceDefinition, services: Layer.Layer<AcceptanceServices>, help: string) {
  const argv = yield* commandLine
  const args = Array.drop(argv, 2)
  const wantsHelp = Array.contains(argv, "--help")

  if (wantsHelp) return yield* Console.log(help)

  return yield* pipe(acceptance(definition, args), Effect.provide(services), Effect.catch(reportFailure))
})

const missingOption = (name: string) => configurationFailure(`${name} is required`)

const requiredOption = (options: Record<string, string>) => (name: string) => {
  const missing = missingOption(name)

  return pipe(options, Record.get(name), Effect.fromOption, Effect.mapError(Function.constant(missing)))
}

const missingKey = configurationFailure("TYPESAFE_API_KEY is required for real calibration (never a mock fallback)")

const calibration = Effect.fn("Acceptance.calibration.main")(function* (args: ReadonlyArray<string>) {
  const options = yield* parseOptions(calibrationOptions, args)
  const option = requiredOption(options)
  const corpora = yield* option("--corpora")
  const models = yield* option("--models")
  const output = yield* option("--output")
  const threshold = optionOr(options, "0.55")("--minimum-confidence")
  const minimumConfidence = yield* pipe(threshold, Schema.decodeUnknownEffect(MinimumConfidenceSchema), Effect.mapError(configurationError))
  const apiKey = yield* pipe(Config.redacted("TYPESAFE_API_KEY"), Effect.mapError(Function.constant(missingKey)))
  const paths = String.split(corpora, ",")
  const modelNames = String.split(models, ",")
  const outputPath = resolve(output)
  const summaries = yield* calibrate(paths, modelNames, outputPath, apiKey, minimumConfidence)
  const evidencePath = join(outputPath, "calibration.json")

  yield* Effect.forEach(summaries, flow(summaryLine, Console.log))
  yield* Console.log(`Calibration evidence: ${evidencePath}`)
})

/** Calibration shares the acceptance command-line conventions because both make real, retained model calls. */
export const runCalibrationCli = Effect.fn("Acceptance.runCalibrationCli")(function* (help: string) {
  const argv = yield* commandLine
  const args = Array.drop(argv, 2)
  const wantsHelp = Array.contains(argv, "--help")

  if (wantsHelp) return yield* Console.log(help)

  return yield* pipe(calibration(args), Effect.catch(reportFailure))
})
