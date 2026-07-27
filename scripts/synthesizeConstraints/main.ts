import * as fs from "node:fs"
import * as path from "node:path"
import {
  Array,
  Console,
  Data,
  Effect,
  Equivalence,
  Function,
  HashMap,
  Option,
  Record,
  Result,
  Struct,
  Tuple,
  flow,
  pipe
} from "effect"
import { makeStageClient, type StageClient } from "./agentClient.ts"
import { auditDocument } from "./audit.ts"
import { resolveConcept } from "./concept.ts"
import {
  ConceptArgumentError,
  Constraint,
  ConstraintDocument,
  ConstraintDraft,
  ConstraintPlan,
  Definition,
  DefinitionDraft,
  Finding,
  ManifestTotals,
  ManifestWriteError,
  Repair,
  RunOptions,
  type Concept,
  type ConstraintSlot,
  type Effort,
  type PipelineError,
  type StageError,
  type StageRecord,
  type Technology,
  type Term,
  type ViolationClass,
  type WorkerError
} from "./data.ts"
import { codeFences } from "./fence.ts"
import { orderDefinitions } from "./order.ts"
import {
  makeConstraintStage,
  makeDefinitionStage,
  makePlanStage,
  makeTechnologyStage,
  makeTermStage,
  makeViolationStage
} from "./prompt.ts"
import { renderDocument } from "./render.ts"
import { checkFences } from "./typecheck.ts"

const usageLines = Array.make(
  "Usage: npm run synthesize -- <concept | @document> [options]",
  "",
  "  --out=<dir>          Output directory (default docs)",
  "  --cache=<dir>        Cache directory (default .cache/synthesize-constraints)",
  "  --model=<pattern>    Model pattern for every stage (default opus)",
  "  --effort=lo|med|hi   Thinking effort for every stage (default hi)",
  "  --attempts=<n>       Repair rounds after the first draft (default 2)",
  "  --concurrency=<n>    Stages in flight at once (default 6)",
  "  --refresh            Recompute every stage, ignoring cached results"
)

const usage = Array.join(usageLines, "\n")

const flagPattern = /^--([a-z]+)(?:=(.*))?$/u

const numberEqual = Equivalence.strictEqual<number>()
const textEqual = Equivalence.strictEqual<string>()

const findingHeading = Struct.get<Finding, "heading">("heading")
const slotTitle = Struct.get<ConstraintSlot, "title">("title")
const slotCoverage = Struct.get<ConstraintSlot, "violationClassIds">("violationClassIds")
const violationIdOf = Struct.get<ViolationClass, "id">("id")
const termNameOf = Struct.get<Term, "name">("name")

const isFlagArgument = (argument: string) => flagPattern.test(argument)
const isPositionalArgument = (argument: string) => !isFlagArgument(argument)
const trueText = Function.constant("true")

const flagValueOf = (match: RegExpMatchArray) =>
  pipe(Array.get(match, 2), Option.getOrElse(trueText))

const flagEntryOf = (match: RegExpMatchArray) => {
  const value = flagValueOf(match)
  const named = (name: string) => Tuple.make(name, value)
  const name = Array.get(match, 1)

  return pipe(name, Option.map(named))
}

// Flags parse into one map because every later default reads the same declared set.
const flagEntry = (argument: string) => {
  const matched = argument.match(flagPattern)
  const present = Option.fromNullishOr(matched)
  const entry = pipe(present, Option.flatMap(flagEntryOf))

  return Option.match(entry, { onNone: Function.constant(Result.failVoid), onSome: Result.succeed })
}

const flagText = (flags: HashMap.HashMap<string, string>, name: string) => HashMap.get(flags, name)

const isWholeCount = (value: number) => {
  const whole = Number.isInteger(value)
  const positive = value >= 0

  return whole && positive
}

// A stated flag must parse because silently defaulting a typo would change what the run costs.
const flagCount = (flags: HashMap.HashMap<string, string>, name: string, fallback: number) => {
  const parseCount = (raw: string) => Number.parseInt(raw, 10)
  const stated = flagText(flags, name)
  const parsed = pipe(stated, Option.map(parseCount), Option.filter(isWholeCount))
  const declared = HashMap.has(flags, name)
  const failure = new ConceptArgumentError({ message: `--${name} must be a whole number.` })
  const rejected = Effect.fail(failure)
  const defaulted = Effect.succeed(fallback)
  const absent = declared ? rejected : defaulted

  return Option.match(parsed, { onNone: Function.constant(absent), onSome: Effect.succeed })
}

const effortNames = Array.make("lo", "med", "hi")
const highEffort = Function.constant("hi")

const makeEffort = (flags: HashMap.HashMap<string, string>) => {
  const declared = flagText(flags, "effort")
  const stated = pipe(declared, Option.getOrElse(highEffort))
  const failure = new ConceptArgumentError({ message: "--effort must be lo, med, or hi." })
  const named = Array.contains(effortNames, stated)

  return named ? Effect.succeed(stated as Effort) : Effect.fail(failure)
}

const defaultCacheDirectory = path.join(".cache", "synthesize-constraints")
const workerPath = path.join("scripts", "synthesizeConstraints", "agentWorker.ts")
const docsDirectory = Function.constant("docs")
const cacheDirectoryDefault = Function.constant(defaultCacheDirectory)
const opusModel = Function.constant("opus")

// One stage may reason for half an hour because a whole document rests on its enumeration.
const maxRuntimeMs = 1_800_000

const makeRunOptions = Effect.fn("Synthesize.makeRunOptions")(function* (
  argv: ReadonlyArray<string>
) {
  const entries = Array.filterMap(argv, flagEntry)
  const flags = HashMap.fromIterable(entries)
  const positional = Array.filter(argv, isPositionalArgument)
  const joined = Array.join(positional, " ")
  const concept = joined.trim()
  const missingConcept = textEqual(concept, "")

  if (missingConcept) {
    yield* Console.error(usage)

    return yield* new ConceptArgumentError({ message: "No concept given." })
  }

  const attempts = yield* flagCount(flags, "attempts", 2)
  const requestedConcurrency = yield* flagCount(flags, "concurrency", 6)
  const effort = yield* makeEffort(flags)
  const statedOut = flagText(flags, "out")
  const outputDirectory = pipe(statedOut, Option.getOrElse(docsDirectory))
  const statedCache = flagText(flags, "cache")
  const cacheDirectory = pipe(statedCache, Option.getOrElse(cacheDirectoryDefault))
  const statedModel = flagText(flags, "model")
  const model = pipe(statedModel, Option.getOrElse(opusModel))
  const concurrency = Math.max(1, requestedConcurrency)
  const refresh = HashMap.has(flags, "refresh")
  const workingDirectory = process.cwd()

  return RunOptions.make({
    concept,
    outputDirectory,
    cacheDirectory,
    model,
    effort,
    attempts,
    concurrency,
    refresh,
    maxRuntimeMs,
    workerPath,
    workingDirectory
  })
})

// A stage that produced nothing is reported because a run must not pass with an entry missing.
const makeGenerationFinding = (kind: string) => (key: string) => (error: string) =>
  Finding.make({
    code: "G1",
    unit: `${kind}/0`,
    heading: key,
    message: `Generation failed: ${error}`
  })

const noFindings = (): ReadonlyArray<Finding> => Array.empty()
const noIds = (): ReadonlyArray<string> => Array.empty()

// Findings group by heading because a repair addresses the entry, not a document position.
const findingsByHeading = (prefix: string) => (findings: ReadonlyArray<Finding>) => {
  const belongs = (finding: Finding) => finding.unit.startsWith(`${prefix}/`)
  const owned = Array.filter(findings, belongs)

  return Array.groupBy(owned, findingHeading)
}

const findingsForKey =
  (grouped: Record.ReadonlyRecord<string, ReadonlyArray<Finding>>) =>
  (key: string): ReadonlyArray<Finding> =>
    pipe(Record.get(grouped, key), Option.getOrElse(noFindings))

const makeRepair = (findings: ReadonlyArray<Finding>, previous: unknown) => {
  const empty = Array.isReadonlyArrayEmpty(findings)
  const repair = Repair.make({ findings, previous })

  return empty ? Option.none<Repair>() : Option.some(repair)
}

// RoundState is one repair round's product because the next round reads its drafts and findings.
class RoundState extends Data.Class<{
  readonly plan: ConstraintPlan
  readonly definitionDrafts: HashMap.HashMap<string, DefinitionDraft>
  readonly constraintDrafts: HashMap.HashMap<string, ConstraintDraft>
  readonly findings: ReadonlyArray<Finding>
  readonly markdown: string
}> {}

const addRequests = (sum: number, record: StageRecord) => sum + record.requests
const addTokens = (sum: number, record: StageRecord) => sum + record.tokens
const wasGenerated = (record: StageRecord) => !record.cached

const makeManifestTotals = (records: ReadonlyArray<StageRecord>) => {
  const generated = Array.filter(records, wasGenerated)
  const requests = Array.reduce(records, 0, addRequests)
  const tokens = Array.reduce(records, 0, addTokens)

  return ManifestTotals.make({
    stages: records.length,
    generated: generated.length,
    requests,
    tokens
  })
}

const writeDocumentFile = (outputPath: string, markdown: string) =>
  Effect.try({
    try: () => {
      const directory = path.dirname(outputPath)

      fs.mkdirSync(directory, { recursive: true })
      fs.writeFileSync(outputPath, markdown, "utf8")

      return outputPath
    },
    catch: (cause) => {
      const stated = String(cause)

      return new ManifestWriteError({ outputPath, message: `Could not write document: ${stated}` })
    }
  })

// The manifest sits beside the cache because a stage key is the hash of the bytes that produced it.
const writeManifestFile = (
  options: RunOptions,
  concept: Concept,
  records: ReadonlyArray<StageRecord>,
  findings: ReadonlyArray<Finding>
) =>
  Effect.try({
    try: () => {
      const manifestName = `${concept.slug}.manifest.json`
      const manifestPath = path.join(options.cacheDirectory, manifestName)
      const totals = makeManifestTotals(records)

      const manifest = {
        concept: concept.name,
        title: concept.title,
        outputPath: concept.outputPath,
        model: options.model,
        effort: options.effort,
        stages: records,
        totals,
        findings
      }

      const serialized = JSON.stringify(manifest, null, 2)

      fs.writeFileSync(manifestPath, `${serialized}\n`, "utf8")

      return manifestPath
    },
    catch: (cause) => {
      const stated = String(cause)
      const outputPath = options.cacheDirectory

      return new ManifestWriteError({ outputPath, message: `Could not write manifest: ${stated}` })
    }
  })

const findingLine = (finding: Finding) =>
  `  [${finding.code}] ${finding.heading}: ${finding.message}`

const findingReport = (findings: ReadonlyArray<Finding>) => {
  const lines = Array.map(findings, findingLine)

  return Array.join(lines, "\n")
}

const applyDraft =
  <A>(results: ReadonlyArray<Result.Result<A, string>>) =>
  (drafts: HashMap.HashMap<string, A>, key: string, index: number) => {
    const settled = Array.get(results, index)
    const succeeded = pipe(settled, Option.flatMap(Result.getSuccess))
    const keep = (draft: A) => HashMap.set(drafts, key, draft)

    return Option.match(succeeded, { onNone: Function.constant(drafts), onSome: keep })
  }

// A failed round keeps the previous draft because a bad repair must not destroy a usable entry.
const applyDrafts = <A>(
  drafts: HashMap.HashMap<string, A>,
  keys: ReadonlyArray<string>,
  results: ReadonlyArray<Result.Result<A, string>>
) => {
  const apply = applyDraft(results)

  return Array.reduce(keys, drafts, apply)
}

const draftFailures = <A>(
  kind: string,
  keys: ReadonlyArray<string>,
  results: ReadonlyArray<Result.Result<A, string>>
) => {
  const failureFor = (key: string, index: number) => {
    const settled = Array.get(results, index)
    const failed = pipe(settled, Option.flatMap(Result.getFailure))
    const finding = flow(makeGenerationFinding(kind)(key), Result.succeed)

    return Option.match(failed, { onNone: Function.constant(Result.failVoid), onSome: finding })
  }

  return Array.filterMap(keys, failureFor)
}

const isCoverageGap = (finding: Finding) => {
  const isGapCode = textEqual(finding.code, "C4")
  const isDocumentWide = textEqual(finding.unit, "document")

  return isGapCode && isDocumentWide
}

const isUnrouted = (finding: Finding) => {
  const isDocumentWide = textEqual(finding.unit, "document")
  const isReplannable = textEqual(finding.code, "C4")
  const unanswerable = !isReplannable

  return isDocumentWide && unanswerable
}

const retainDrafts =
  (previous: HashMap.HashMap<string, ConstraintDraft>) =>
  (drafts: HashMap.HashMap<string, ConstraintDraft>, title: string) => {
    const existing = HashMap.get(previous, title)
    const keep = (draft: ConstraintDraft) => HashMap.set(drafts, title, draft)

    return Option.match(existing, { onNone: Function.constant(drafts), onSome: keep })
  }

// An unclaimed class is a planning defect because no existing rule was asked to reject it.
const replanCoverage = (
  concept: Concept,
  violations: ReadonlyArray<ViolationClass>,
  client: StageClient
) =>
  Effect.fn("Synthesize.replanCoverage")(function* (state: RoundState) {
    const gaps = Array.filter(state.findings, isCoverageGap)
    const unrouted = Array.filter(state.findings, isUnrouted)
    const hasUnrouted = Array.isReadonlyArrayNonEmpty(unrouted)

    if (hasUnrouted) {
      const report = findingReport(unrouted)

      yield* Console.error(`findings no entry can answer:\n${report}`)
    }

    const covered = Array.isReadonlyArrayEmpty(gaps)

    if (covered) {
      return state
    }

    const repair = makeRepair(gaps, state.plan)
    const replanStage = makePlanStage(concept, violations, repair)
    const replanned = client.make(replanStage)
    const keepPlan = Function.constant(state.plan)
    const planned = yield* Effect.orElseSucceed(replanned, keepPlan)
    const retainedTitles = Array.map(planned.constraints, slotTitle)
    const retain = retainDrafts(state.constraintDrafts)
    const empty = HashMap.empty<string, ConstraintDraft>()
    const constraintDrafts = Array.reduce(retainedTitles, empty, retain)

    return new RoundState({
      plan: planned,
      definitionDrafts: state.definitionDrafts,
      constraintDrafts,
      findings: state.findings,
      markdown: state.markdown
    })
  })

const runPipeline = Effect.fn("Synthesize.runPipeline")(function* (
  options: RunOptions,
  concept: Concept,
  client: StageClient
) {
  const scratchDirectory = path.join(options.cacheDirectory, "fences")
  const checkDocumentFences = checkFences(scratchDirectory)
  const technologyStage = makeTechnologyStage(concept)
  const inventory = yield* client.make(technologyStage)
  const technologies: ReadonlyArray<Technology> = inventory.technologies
  const violationStage = makeViolationStage(concept, technologies)
  const enumeration = yield* client.make(violationStage)
  const violations: ReadonlyArray<ViolationClass> = enumeration.violations
  const termStage = makeTermStage(concept, technologies, violations)
  const inventoried = yield* client.make(termStage)
  const termNames = Array.map(inventoried.terms, termNameOf)
  const noRepair = Option.none<Repair>()
  const firstPlanStage = makePlanStage(concept, violations, noRepair)
  const firstPlan = yield* client.make(firstPlanStage)

  const coverageFor = (plan: ConstraintPlan) => (title: string) => {
    const matchesTitle = (slot: ConstraintSlot) => textEqual(slot.title, title)
    const slot = Array.findFirst(plan.constraints, matchesTitle)
    const claimed = pipe(slot, Option.map(slotCoverage))

    return pipe(claimed, Option.getOrElse(noIds))
  }

  const definitionEntryFor =
    (drafts: HashMap.HashMap<string, DefinitionDraft>) => (term: string) => {
      const draft = HashMap.get(drafts, term)
      const definitionOf = (found: DefinitionDraft) => Definition.make({ term, ...found })
      const entry = flow(definitionOf, Result.succeed)

      return Option.match(draft, { onNone: Function.constant(Result.failVoid), onSome: entry })
    }

  const constraintEntryFor =
    (plan: ConstraintPlan, drafts: HashMap.HashMap<string, ConstraintDraft>) => (title: string) => {
      const draft = HashMap.get(drafts, title)
      const violationClassIds = coverageFor(plan)(title)

      const constraintOf = (found: ConstraintDraft) =>
        Constraint.make({ title, violationClassIds, ...found })

      const entry = flow(constraintOf, Result.succeed)

      return Option.match(draft, { onNone: Function.constant(Result.failVoid), onSome: entry })
    }

  const replan = replanCoverage(concept, violations, client)

  // A round drafts what is missing or unfixed because only an assembled document can be audited.
  const advanceRound: (
    round: number,
    state: RoundState
  ) => Effect.Effect<RoundState, StageError | WorkerError> = Effect.fn("Synthesize.advanceRound")(
    function* (round: number, state: RoundState) {
      const definitionGroups = findingsByHeading("definition")(state.findings)
      const constraintGroups = findingsByHeading("constraint")(state.findings)
      const definitionFindingsFor = findingsForKey(definitionGroups)
      const constraintFindingsFor = findingsForKey(constraintGroups)

      const isPendingDefinition = (term: string) => {
        const undrafted = !HashMap.has(state.definitionDrafts, term)
        const outstanding = definitionFindingsFor(term)
        const unfixed = Array.isReadonlyArrayNonEmpty(outstanding)

        return undrafted || unfixed
      }

      const isPendingConstraint = (title: string) => {
        const undrafted = !HashMap.has(state.constraintDrafts, title)
        const outstanding = constraintFindingsFor(title)
        const unfixed = Array.isReadonlyArrayNonEmpty(outstanding)

        return undrafted || unfixed
      }

      const planTitles = Array.map(state.plan.constraints, slotTitle)
      const draftTerms = Array.filter(termNames, isPendingDefinition)
      const draftTitles = Array.filter(planTitles, isPendingConstraint)
      const draftCount = draftTerms.length + draftTitles.length
      const hasDrafting = draftCount > 0

      if (hasDrafting) {
        yield* Console.error(
          `round ${round}: drafting ${draftTerms.length} definitions, ${draftTitles.length} constraints`
        )
      }

      const makeDefinitionSpec = (term: string) => {
        const outstanding = definitionFindingsFor(term)
        const previous = HashMap.get(state.definitionDrafts, term)
        const stated = Option.getOrUndefined(previous)
        const repair = makeRepair(outstanding, stated)

        return makeDefinitionStage(concept, term, termNames, repair)
      }

      const claimedViolations = (title: string) => {
        const claimed = coverageFor(state.plan)(title)

        const isClaimed = (violation: ViolationClass) => {
          const id = violationIdOf(violation)

          return Array.contains(claimed, id)
        }

        return Array.filter(violations, isClaimed)
      }

      const makeConstraintSpec = (title: string) => {
        const outstanding = constraintFindingsFor(title)
        const previous = HashMap.get(state.constraintDrafts, title)
        const stated = Option.getOrUndefined(previous)
        const repair = makeRepair(outstanding, stated)
        const claimed = claimedViolations(title)

        return makeConstraintStage(concept, title, claimed, termNames, repair)
      }

      const definitionSpecs = Array.map(draftTerms, makeDefinitionSpec)
      const constraintSpecs = Array.map(draftTitles, makeConstraintSpec)
      const definitionWave = client.makeAll(definitionSpecs)
      const constraintWave = client.makeAll(constraintSpecs)
      const waves = Tuple.make(definitionWave, constraintWave)
      // One wave covers both because definitions and rules are independent of each other.
      const settled = yield* Effect.all(waves, { concurrency: 2 })
      const definitionResults = Tuple.get(settled, 0)
      const constraintResults = Tuple.get(settled, 1)
      const definitionDrafts = applyDrafts(state.definitionDrafts, draftTerms, definitionResults)
      const constraintDrafts = applyDrafts(state.constraintDrafts, draftTitles, constraintResults)
      const definitionFailures = draftFailures("definition", draftTerms, definitionResults)
      const constraintFailures = draftFailures("constraint", draftTitles, constraintResults)
      const entryFor = definitionEntryFor(definitionDrafts)
      const ruleFor = constraintEntryFor(state.plan, constraintDrafts)
      const entries = Array.filterMap(termNames, entryFor)
      const rules = Array.filterMap(planTitles, ruleFor)
      const ordering = orderDefinitions(entries)

      const document = ConstraintDocument.make({
        title: concept.title,
        informalDefinition: inventoried.informalDefinition,
        definitions: ordering.definitions,
        constraints: rules
      })

      const markdown = renderDocument(document)
      const fences = codeFences(document)
      const checked = checkDocumentFences(fences)
      const fenceFindings = yield* Effect.orElseSucceed(checked, noFindings)
      const auditFindings = auditDocument(document, markdown, ordering, violations)

      const findings = pipe(
        definitionFailures,
        Array.appendAll(constraintFailures),
        Array.appendAll(auditFindings),
        Array.appendAll(fenceFindings)
      )

      const next = new RoundState({
        plan: state.plan,
        definitionDrafts,
        constraintDrafts,
        findings,
        markdown
      })

      const clean = Array.isReadonlyArrayEmpty(findings)
      const exhausted = numberEqual(round, options.attempts)
      const finished = clean || exhausted

      if (finished) {
        return next
      }

      const replanned = yield* replan(next)

      return yield* advanceRound(round + 1, replanned)
    }
  )

  const noDefinitionDrafts = HashMap.empty<string, DefinitionDraft>()
  const noConstraintDrafts = HashMap.empty<string, ConstraintDraft>()
  const noStartingFindings: ReadonlyArray<Finding> = Array.empty()

  const initial = new RoundState({
    plan: firstPlan,
    definitionDrafts: noDefinitionDrafts,
    constraintDrafts: noConstraintDrafts,
    findings: noStartingFindings,
    markdown: ""
  })

  const final = yield* advanceRound(0, initial)
  const records = yield* client.records

  yield* writeDocumentFile(concept.outputPath, final.markdown)
  yield* writeManifestFile(options, concept, records, final.findings)

  const totals = makeManifestTotals(records)
  const definitionCount = HashMap.size(final.definitionDrafts)
  const constraintCount = HashMap.size(final.constraintDrafts)

  const summaryLines = Array.make(
    `wrote ${concept.outputPath}`,
    `  ${definitionCount} definitions, ${constraintCount} constraints, ${violations.length} violation classes`,
    `  ${totals.generated} of ${totals.stages} stages generated`,
    ""
  )

  const summary = Array.join(summaryLines, "\n")

  yield* Console.error(summary)

  const clean = Array.isReadonlyArrayEmpty(final.findings)

  if (clean) {
    return 0
  }

  const report = findingReport(final.findings)

  yield* Console.error(`${final.findings.length} unresolved findings:\n${report}`)

  return 1
})

const reportFailure = (cause: PipelineError) => {
  const reported = Console.error(`Error: ${cause.message}`)

  return Effect.as(reported, 1)
}

const program = Effect.gen(function* () {
  const argv = Array.drop(process.argv, 2)
  const options = yield* makeRunOptions(argv)
  const concept = yield* resolveConcept(options.outputDirectory)(options.concept)
  const client = yield* makeStageClient(options)

  return yield* runPipeline(options, concept, client)
})

// A usage or configuration error is a message, not a crash, because a stack tells a caller nothing.
const reported = Effect.catch(program, reportFailure)
const scoped = Effect.scoped(reported)

const exitCode = await Effect.runPromise(scoped)

process.exitCode = exitCode
