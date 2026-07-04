import {
  Array,
  HashMap,
  HashSet,
  Match,
  Option,
  Order,
  Predicate,
  Record,
  Schema,
  Struct,
  pipe
} from "effect"
import { Finding } from "../rules/index.js"
import type { DetectorRole, Rule } from "../rules/types.js"
import {
  Summary,
  combineSummaries,
  emptySummary,
  summarizeFileFindings
} from "../syndromes/summary.js"
import type { RoleLookup } from "../syndromes/summary.js"
import {
  Interpretation,
  findingFrom,
  syndromeIdEntry,
  syndromeMentions
} from "../syndromes/types.js"
import type { Syndrome, SyndromeRegistry } from "../syndromes/types.js"
import { ConditionContext, evaluateSyndrome } from "./evaluateMatcher.js"

const findingPath: (finding: Finding) => string = Struct.get("path")

const ruleRole: (rule: Rule) => DetectorRole = Struct.get("role")

const ruleId: (rule: Rule) => string = Struct.get("id")

const fallbackFindingRole = (): DetectorRole => "finding"

const ruleRoleEntry = (rule: Rule): readonly [string, DetectorRole] => [
  ruleId(rule),
  ruleRole(rule)
]

const adviceRoleEntry = (
  syndrome: Syndrome
): readonly [string, DetectorRole] => [syndrome.id, "advice"]

const isFindingRoleMatch =
  (roleOf: RoleLookup) =>
  (finding: Finding): boolean =>
    roleOf(finding.detectorId) === "finding"

const ancestorAt =
  (segments: ReadonlyArray<string>) =>
  (segment: string, index: number): string =>
    segments.slice(0, index + 1).join("/")

// "src/mcp/server.ts" belongs to "src" and "src/mcp": the directories a file-positioned finding aggregates into.
const parentDirectories = (path: string): ReadonlyArray<string> => {
  const normalized = path.replaceAll("\\", "/")
  const segments = normalized.split("/")
  const parents = segments.slice(0, -1)

  return parents.map(ancestorAt(parents))
}

const carriedFindingsSchema = Schema.Array(Finding)

// One file's slice of the finding stream: everything a file-level ConditionContext needs.
class FileProfile extends Schema.Class<FileProfile>("FileProfile")({
  fileName: Schema.String,
  findingMatches: carriedFindingsSchema,
  summary: Summary
}) {}

const profileSummary: (profile: FileProfile) => Summary = Struct.get("summary")

const toFileProfile =
  (roleOf: RoleLookup) =>
  (entry: readonly [string, ReadonlyArray<Finding>]): FileProfile => {
    const summary = summarizeFileFindings(roleOf)(entry[1])
    const findingMatches = entry[1].filter(isFindingRoleMatch(roleOf))

    return new FileProfile({ fileName: entry[0], findingMatches, summary })
  }

const profileEntry = (profile: FileProfile): readonly [string, FileProfile] => [
  profile.fileName,
  profile
]

// The interpreter proper: evaluate the syndrome's require/observe sentences against a node's context; a firing sentence denotes an advice finding carrying its evaluation trace.
const runSyndromeAt =
  (context: ConditionContext) =>
  (path: string) =>
  (syndrome: Syndrome): Option.Option<Finding> => {
    const build = findingFrom(syndrome)(path)

    return pipe(evaluateSyndrome(context)(syndrome), Option.map(build))
  }

const noFindings: ReadonlyArray<Finding> = []

const constEmptySummary = (): Summary => emptySummary

const addSummaryAt =
  (summary: Summary) =>
  (
    directories: HashMap.HashMap<string, Summary>,
    path: string
  ): HashMap.HashMap<string, Summary> => {
    const current = pipe(
      HashMap.get(directories, path),
      Option.getOrElse(constEmptySummary)
    )
    const combined = combineSummaries(current, summary)

    return HashMap.set(directories, path, combined)
  }

const noDirectorySummaries: HashMap.HashMap<string, Summary> = HashMap.empty()

const isDescendantAdvice =
  (candidate: Finding) =>
  (other: Finding): boolean => {
    const isSameDetector = other.detectorId === candidate.detectorId
    const isDeeper = other.path.startsWith(`${candidate.path}/`)

    return [isSameDetector, isDeeper].every(Boolean)
  }

const adviceLevelRanks: Record<string, number> = {
  file: 0,
  directory: 1,
  project: 2
}

const adviceLevelRank = (finding: Finding): number =>
  adviceLevelRanks[finding.level] ?? 3

const findingDetectorId: (finding: Finding) => string = Struct.get("detectorId")

const byLevel = Order.mapInput(Order.number, adviceLevelRank)
const byPath = Order.mapInput(Order.string, findingPath)
const byDetectorId = Order.mapInput(Order.string, findingDetectorId)
const byPathThenDetector = Order.combine(byPath, byDetectorId)
const adviceOrder = Order.combine(byLevel, byPathThenDetector)

// "src/mcp/server.ts" contributes its summary to "src" and "src/mcp": the directory fold is the file fold plus ancestor accumulation.
const addFileToDirectories = (
  directories: HashMap.HashMap<string, Summary>,
  profile: FileProfile
): HashMap.HashMap<string, Summary> => {
  const ancestors = parentDirectories(profile.fileName)

  return ancestors.reduce(addSummaryAt(profile.summary), directories)
}

// --- the stratified schedule (adrs/0003): strata are computed from the mentions DAG, and each wave's advice findings feed the summaries the next wave reads ---

type SyndromeIndex = HashMap.HashMap<string, Syndrome>

const maxDepth = (left: number, right: number): number => Math.max(left, right)

const stratumWithSeen =
  (byId: SyndromeIndex) =>
  (seen: HashSet.HashSet<string>) =>
  (detectorId: string): number => {
    const syndrome = HashMap.get(byId, detectorId)
    // Rules and unknown ids ground the recursion at stratum 0; a revisited id would be a cycle, which the acyclicity governance test rejects, so grounding it keeps evaluation total.
    const grounded = [
      Option.isNone(syndrome),
      HashSet.has(seen, detectorId)
    ].some(Boolean)

    if (grounded) {
      return 0
    }

    const nextSeen = HashSet.add(seen, detectorId)
    const step = stratumWithSeen(byId)(nextSeen)
    const mentionLists = Option.map(syndrome, syndromeMentions)
    const mentions = Option.getOrElse(mentionLists, Array.empty)
    const depths = mentions.map(step)
    const deepest = depths.reduce(maxDepth, 0)

    return 1 + deepest
  }

// A syndrome's stratum: 1 when its sentences mention only rules (or nothing), one deeper per layer of advice it consumes. Exported for the governance suite.
export const syndromeStratum =
  (syndromes: ReadonlyArray<Syndrome>) =>
  (syndrome: Syndrome): number => {
    const entries = syndromes.map(syndromeIdEntry)
    const byId = HashMap.fromIterable(entries)
    const noSeen = HashSet.empty<string>()

    return stratumWithSeen(byId)(noSeen)(syndrome.id)
  }

export const registrySyndromes = (
  registry: SyndromeRegistry
): ReadonlyArray<Syndrome> => {
  const fileLevel = registry.fileSyndromes.concat(registry.fileFallbacks)
  const withDirectories = fileLevel.concat(registry.directorySyndromes)

  return withDirectories.concat(registry.projectSyndromes)
}

const profilesSchema = Schema.HashMapFromSelf({
  key: Schema.String,
  value: FileProfile
})

const summariesSchema = Schema.HashMapFromSelf({
  key: Schema.String,
  value: Summary
})

const adviceListSchema = Schema.Array(Finding)

const firedFilesSchema = Schema.HashSetFromSelf(Schema.String)

// The fold state one wave hands the next: summaries at every tree position plus the advice already emitted. firedFiles tracks files with specific file-level advice so fallbacks stay suppressed across strata.
class InterpretationState extends Schema.Class<InterpretationState>(
  "InterpretationState"
)({
  profiles: profilesSchema,
  directorySummaries: summariesSchema,
  projectSummary: Summary,
  advice: adviceListSchema,
  firedFiles: firedFilesSchema
}) {}

const absorbIntoProfile =
  (single: Summary) =>
  (profile: FileProfile): FileProfile => {
    const summary = combineSummaries(profile.summary, single)

    return new FileProfile({
      fileName: profile.fileName,
      findingMatches: profile.findingMatches,
      summary
    })
  }

// Every advice finding becomes consumable exactly where the model says: at its own position, at every ancestor directory, and at the project root.
const absorbAdvice =
  (roleOf: RoleLookup) =>
  (state: InterpretationState, finding: Finding): InterpretationState => {
    const single = summarizeFileFindings(roleOf)([finding])
    const projectSummary = combineSummaries(state.projectSummary, single)
    const advice = Array.append(state.advice, finding)
    const touchedDirectories = pipe(
      Match.value(finding.level),
      Match.when("file", () => parentDirectories(finding.path)),
      // Inlined per no-single-use-callee: itself plus every ancestor, so deeper advice stays consumable at every enclosing level.
      Match.when("directory", () => {
        const normalized = finding.path.replaceAll("\\", "/")
        const segments = normalized.split("/")

        return segments.map(ancestorAt(segments))
      }),
      Match.orElse(() => [])
    )
    const directorySummaries = touchedDirectories.reduce(
      addSummaryAt(single),
      state.directorySummaries
    )
    const isFileAdvice = finding.level === "file"
    const profiles = isFileAdvice
      ? HashMap.modify(state.profiles, finding.path, absorbIntoProfile(single))
      : state.profiles

    return new InterpretationState({
      profiles,
      directorySummaries,
      projectSummary,
      advice,
      firedFiles: state.firedFiles
    })
  }

const runWave =
  (registry: SyndromeRegistry) =>
  (roleOf: RoleLookup) =>
  (stratumOf: (syndrome: Syndrome) => number) =>
  (state: InterpretationState, stratum: number): InterpretationState => {
    const inWave = (syndrome: Syndrome): boolean =>
      stratumOf(syndrome) === stratum
    const profiles = HashMap.toValues(state.profiles)
    const specificSyndromes = registry.fileSyndromes.filter(inWave)
    const fallbackSyndromes = registry.fileFallbacks.filter(inWave)
    const directorySyndromes = registry.directorySyndromes.filter(inWave)
    const projectSyndromes = registry.projectSyndromes.filter(inWave)

    const fileContext = (profile: FileProfile): ConditionContext =>
      new ConditionContext({
        summary: profile.summary,
        findingMatches: profile.findingMatches,
        projectSummary: state.projectSummary
      })

    const specificAdviceFor = (
      profile: FileProfile
    ): ReadonlyArray<Finding> => {
      const context = fileContext(profile)
      const run = runSyndromeAt(context)(profile.fileName)

      return Array.filterMap(specificSyndromes, run)
    }

    const specificAdvice = profiles.flatMap(specificAdviceFor)
    const specificPaths = specificAdvice.map(findingPath)
    const newlyFired = HashSet.fromIterable(specificPaths)
    const firedFiles = HashSet.union(state.firedFiles, newlyFired)

    const fallbackAdviceFor = (
      profile: FileProfile
    ): ReadonlyArray<Finding> => {
      if (HashSet.has(firedFiles, profile.fileName)) {
        return []
      }

      const context = fileContext(profile)
      const run = runSyndromeAt(context)(profile.fileName)

      return Array.filterMap(fallbackSyndromes, run)
    }

    const fallbackAdvice = profiles.flatMap(fallbackAdviceFor)

    const directoryAdviceFor = (
      entry: readonly [string, Summary]
    ): ReadonlyArray<Finding> => {
      const context = new ConditionContext({
        summary: entry[1],
        findingMatches: noFindings,
        projectSummary: state.projectSummary
      })
      const run = runSyndromeAt(context)(entry[0])

      return Array.filterMap(directorySyndromes, run)
    }

    const directoryEntries = HashMap.toEntries(state.directorySummaries)
    const allDirectoryAdvice = directoryEntries.flatMap(directoryAdviceFor)
    // An ancestor directory always aggregates its children's counts, so "src" would fire whenever "src/mcp" does; keep only the deepest advice per detector.
    const hasDeeperTwin = (candidate: Finding): boolean =>
      allDirectoryAdvice.some(isDescendantAdvice(candidate))
    const directoryAdvice = allDirectoryAdvice.filter(
      Predicate.not(hasDeeperTwin)
    )

    const projectContext = new ConditionContext({
      summary: state.projectSummary,
      findingMatches: noFindings,
      projectSummary: state.projectSummary
    })
    const runProject = runSyndromeAt(projectContext)("")
    const projectAdvice = Array.filterMap(projectSyndromes, runProject)

    const fileAdvice = specificAdvice.concat(fallbackAdvice)
    const higherAdvice = directoryAdvice.concat(projectAdvice)
    const waveAdvice = fileAdvice.concat(higherAdvice)
    const absorbed = waveAdvice.reduce(absorbAdvice(roleOf), state)

    return new InterpretationState({
      profiles: absorbed.profiles,
      directorySummaries: absorbed.directorySummaries,
      projectSummary: absorbed.projectSummary,
      advice: absorbed.advice,
      firedFiles
    })
  }

export const interpretMatches =
  (registry: SyndromeRegistry) =>
  (rules: ReadonlyArray<Rule>) =>
  (findings: ReadonlyArray<Finding>): Interpretation => {
    const syndromes = registrySyndromes(registry)
    const ruleEntries = rules.map(ruleRoleEntry)
    const adviceEntries = syndromes.map(adviceRoleEntry)
    const roleEntries = ruleEntries.concat(adviceEntries)
    const roles = HashMap.fromIterable(roleEntries)
    const roleOf: RoleLookup = (id) =>
      pipe(HashMap.get(roles, id), Option.getOrElse(fallbackFindingRole))
    const grouped = Array.groupBy(findings, findingPath)
    const fileEntries = Record.toEntries(grouped)
    const fileProfiles = fileEntries.map(toFileProfile(roleOf))
    const profileEntries = fileProfiles.map(profileEntry)
    const profiles = HashMap.fromIterable(profileEntries)
    const summaries = fileProfiles.map(profileSummary)
    const projectSummary = summaries.reduce(combineSummaries, emptySummary)
    const directorySummaries = fileProfiles.reduce(
      addFileToDirectories,
      noDirectorySummaries
    )
    const initialState = new InterpretationState({
      profiles,
      directorySummaries,
      projectSummary,
      advice: [],
      firedFiles: noFiredFiles
    })
    const stratumOf = (syndrome: Syndrome): number =>
      syndromeStratum(syndromes)(syndrome)
    const strata = syndromes.map(stratumOf)
    const deepestStratum = strata.reduce(maxDepth, 0)
    const waves = deepestStratum >= 1 ? Array.range(1, deepestStratum) : noWaves
    const finalState = waves.reduce(
      runWave(registry)(roleOf)(stratumOf),
      initialState
    )
    const advice = Array.sort(finalState.advice, adviceOrder)

    return new Interpretation({ advice })
  }

const noWaves: ReadonlyArray<number> = []

const noFiredFiles: HashSet.HashSet<string> = HashSet.empty()
