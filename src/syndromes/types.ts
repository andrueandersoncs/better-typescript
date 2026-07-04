import { Array, HashMap, HashSet, Option, Schema, pipe } from "effect"
import { matcherMentions, matcherSchema } from "../matcher/language.js"
import { Finding } from "../rules/index.js"
import type { Evidence } from "../rules/types.js"

const levelSchema = Schema.Literal("file", "directory", "project")

export type SyndromeLevel = "file" | "directory" | "project"

const matchersSchema = Schema.Array(matcherSchema)

const adviceRole = (): "advice" => "advice"

const adviceLiteralSchema = Schema.Literal("advice")

// Summary detectors always interpret; they never gate the exit code and never appear in the style guide.
const adviceRoleSchema = Schema.optionalWith(adviceLiteralSchema, {
  default: adviceRole
})

// A syndrome is the summary-detector species: pure data — sentences in the matcher language plus their denotation. `require` terms must all hold for the detector to fire; `observe` terms never gate and only contribute measurements to the evidence. title/remediation are its constant reporter.
export class Syndrome extends Schema.Class<Syndrome>("Syndrome")({
  id: Schema.String,
  title: Schema.String,
  level: levelSchema,
  require: matchersSchema,
  observe: matchersSchema,
  remediation: Schema.String,
  role: adviceRoleSchema
}) {}

const syndromesSchema = Schema.Array(Syndrome)

// Fallbacks run only when no specific file syndrome fired on the same file, so generic density advice never drowns out a precise diagnosis. Nonmonotone selection is registry policy, not a sentence (ADR-0003 invariant 2).
export class SyndromeRegistry extends Schema.Class<SyndromeRegistry>(
  "SyndromeRegistry"
)({
  fileSyndromes: syndromesSchema,
  fileFallbacks: syndromesSchema,
  directorySyndromes: syndromesSchema,
  projectSyndromes: syndromesSchema
}) {}

// The detector ids this syndrome's sentences mention: derived, never declared. These edges are the dependency DAG the scheduler stratifies.
export const syndromeMentions = (syndrome: Syndrome): ReadonlyArray<string> => {
  const matchers = syndrome.require.concat(syndrome.observe)
  const mentions = matchers.flatMap(matcherMentions)

  return Array.dedupe(mentions)
}

export const syndromeIdEntry = (
  syndrome: Syndrome
): readonly [string, Syndrome] => [syndrome.id, syndrome]

const reachesTarget =
  (byId: HashMap.HashMap<string, Syndrome>) =>
  (target: string) =>
  (seen: HashSet.HashSet<string>) =>
  (detectorId: string): boolean => {
    const isTarget = detectorId === target
    const syndrome = HashMap.get(byId, detectorId)
    const alreadySeen = HashSet.has(seen, detectorId)
    // A rule id or a revisited node ends the walk; the target itself still counts wherever the walk stops.
    const walkEnds = [Option.isNone(syndrome), alreadySeen].some(Boolean)

    if (walkEnds) {
      return isTarget
    }

    const mentionLists = pipe(syndrome, Option.map(syndromeMentions))
    const mentions = Option.getOrElse(mentionLists, Array.empty)
    const nextSeen = HashSet.add(seen, detectorId)
    const reachesFromMention = mentions.some(
      reachesTarget(byId)(target)(nextSeen)
    )

    return [isTarget, reachesFromMention].some(Boolean)
  }

// True when following the syndrome's mention edges ever returns to the syndrome itself. The scheduler grounds cycles defensively; this predicate lets governance reject them outright.
export const hasMentionCycle =
  (syndromes: ReadonlyArray<Syndrome>) =>
  (syndrome: Syndrome): boolean => {
    const entries = syndromes.map(syndromeIdEntry)
    const byId = HashMap.fromIterable(entries)
    const noSeen = HashSet.empty<string>()
    const reachesSelf = reachesTarget(byId)(syndrome.id)(noSeen)

    return syndromeMentions(syndrome).some(reachesSelf)
  }

// A firing syndrome denotes an advice finding: title/remediation land in the presentation fields, the evaluation trace in evidence, and line/column stay 0 because advice has no source position.
export const findingFrom =
  (syndrome: Syndrome) =>
  (path: string) =>
  (evidence: Evidence): Finding =>
    new Finding({
      detectorId: syndrome.id,
      level: syndrome.level,
      path,
      message: syndrome.title,
      hint: syndrome.remediation,
      evidence
    })

const adviceSchema = Schema.Array(Finding)

// The interpreter's product: the advice findings of every summary detector, sorted for presentation. Presentation folds over this, never over raw syndromes.
export class Interpretation extends Schema.Class<Interpretation>(
  "Interpretation"
)({
  advice: adviceSchema
}) {}
