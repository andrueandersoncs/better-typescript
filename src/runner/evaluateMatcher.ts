import {
  Array,
  HashMap,
  HashSet,
  Match,
  Option,
  Order,
  Record,
  Schema,
  Struct,
  pipe
} from "effect"
import type {
  And,
  AtLeast,
  CollidingLines,
  DominantRule,
  FilesWithFindings,
  FindingBreakdown,
  Matcher,
  Not,
  Or,
  ShareOfProject
} from "../matcher/language.js"
import { describeMatcher } from "../matcher/language.js"
import { Finding } from "../rules/index.js"
import { Summary, countAt } from "../syndromes/summary.js"
import { EvidenceItem } from "../rules/types.js"
import type { Evidence } from "../rules/types.js"
import type { Syndrome } from "../syndromes/types.js"

const matchesSchema = Schema.Array(Finding)

// Everything the summary evaluator may measure at one tree node. AST atoms (Kind, Text*, navigation) measure zero here: they evaluate at L0 inside compiled rules.
export class ConditionContext extends Schema.Class<ConditionContext>(
  "ConditionContext"
)({
  summary: Summary,
  findingMatches: matchesSchema,
  projectSummary: Summary
}) {}

const evidenceSchema = Schema.Array(EvidenceItem)

// A term's denotation: whether it held, and the measurements taken while deciding. Evidence is the evaluation trace, so a syndrome cannot fire without showing why.
export class Measurement extends Schema.Class<Measurement>("Measurement")({
  satisfied: Schema.Boolean,
  evidence: evidenceSchema
}) {}

const measurementSatisfied: (measurement: Measurement) => boolean =
  Struct.get("satisfied")

const measurementEvidence: (measurement: Measurement) => Evidence =
  Struct.get("evidence")

const evidenceMeasure: (item: EvidenceItem) => string = Struct.get("measure")

const evidenceCount: (item: EvidenceItem) => number = Struct.get("count")

const descendingNumber = Order.reverse(Order.number)
const byCountDescending = Order.mapInput(descendingNumber, evidenceCount)
const byMeasure = Order.mapInput(Order.string, evidenceMeasure)
const evidenceOrder = Order.combine(byCountDescending, byMeasure)

const entryEvidence = (entry: readonly [string, number]): EvidenceItem =>
  new EvidenceItem({ measure: entry[0], count: entry[1] })

// --- counting semantics: indexed where the Summary can answer, per-match otherwise ---

const indexedCount =
  (summary: Summary) =>
  (matcher: Matcher): Option.Option<number> =>
    pipe(
      Match.value(matcher),
      Match.tag("FindingOf", (term) => {
        const count = countAt(summary.countsByDetector)(term.detectorId)

        return Option.some(count)
      }),
      Match.tag("FindingWithFacet", (term) => {
        const count = countAt(summary.countsByFacet)(
          `${term.detectorId}/${term.facet}`
        )

        return Option.some(count)
      }),
      Match.tag("AnyFinding", () => Option.some(summary.findingTotal)),
      Match.orElse(() => Option.none())
    )

const matchPredicate =
  (matcher: Matcher) =>
  (match: Finding): boolean =>
    pipe(
      Match.value(matcher),
      Match.tag("FindingOf", (term) => match.detectorId === term.detectorId),
      Match.tag("FindingWithFacet", (term) => {
        const isSameDetector = match.detectorId === term.detectorId

        return isSameDetector ? match.facets.includes(term.facet) : false
      }),
      Match.tag("AnyFinding", () => true),
      Match.tag("And", (term) => term.terms.every(satisfiesMatch(match))),
      Match.tag("Or", (term) => term.terms.some(satisfiesMatch(match))),
      Match.tag("Not", (term) => !matchPredicate(term.term)(match)),
      Match.orElse(() => false)
    )

const satisfiesMatch =
  (match: Finding) =>
  (matcher: Matcher): boolean =>
    matchPredicate(matcher)(match)

// Bare atoms count through the countsByDetector index whatever the referenced detector's role; the per-finding walk only serves combinator terms over the node's carried findings.
const countMatcher =
  (context: ConditionContext) =>
  (matcher: Matcher): number => {
    const indexed = indexedCount(context.summary)(matcher)
    const walked = (): number =>
      context.findingMatches.filter(matchPredicate(matcher)).length

    return Option.getOrElse(indexed, walked)
  }

// --- the L1 interpreter: one branch per term ---

const countedMeasurement =
  (context: ConditionContext) =>
  (matcher: Matcher) =>
  (minimum: number): Measurement => {
    const count = countMatcher(context)(matcher)
    const measure = describeMatcher(matcher)
    const item = new EvidenceItem({ measure, count })

    return new Measurement({ satisfied: count >= minimum, evidence: [item] })
  }

const evaluateAnd =
  (context: ConditionContext) =>
  (term: And): Measurement => {
    const results = term.terms.map(evaluateMatcher(context))
    const satisfied = results.every(measurementSatisfied)
    const evidence = results.flatMap(measurementEvidence)

    return new Measurement({ satisfied, evidence })
  }

const evaluateOr =
  (context: ConditionContext) =>
  (term: Or): Measurement => {
    const results = term.terms.map(evaluateMatcher(context))
    const satisfied = results.some(measurementSatisfied)
    const evidence = results.flatMap(measurementEvidence)

    return new Measurement({ satisfied, evidence })
  }

const evaluateNot =
  (context: ConditionContext) =>
  (term: Not): Measurement => {
    const inner = evaluateMatcher(context)(term.term)

    return new Measurement({
      satisfied: !inner.satisfied,
      evidence: inner.evidence
    })
  }

const evaluateAtLeast =
  (context: ConditionContext) =>
  (term: AtLeast): Measurement =>
    countedMeasurement(context)(term.term)(term.minimum)

const evaluateShareOfProject =
  (context: ConditionContext) =>
  (term: ShareOfProject): Measurement => {
    const localCount = countMatcher(context)(term.term)
    const projectContext = new ConditionContext({
      summary: context.projectSummary,
      findingMatches: [],
      projectSummary: context.projectSummary
    })
    const projectCount = countMatcher(projectContext)(term.term)
    const satisfied =
      localCount * term.denominator >= projectCount * term.numerator
    const percent =
      projectCount > 0 ? Math.floor((localCount * 100) / projectCount) : 0
    const measure = describeMatcher(term)
    const item = new EvidenceItem({ measure, count: percent })

    return new Measurement({ satisfied, evidence: [item] })
  }

const evaluateFilesWithFindings =
  (context: ConditionContext) =>
  (term: FilesWithFindings): Measurement => {
    const count = context.summary.fileCount
    const satisfied = count >= term.minimum
    const item = new EvidenceItem({ measure: "files-with-findings", count })

    return new Measurement({ satisfied, evidence: [item] })
  }

const matchDetectorId: (match: Finding) => string = Struct.get("detectorId")

const matchLineKey = (match: Finding): string => `${match.line}`

const hasDistinctRules = (
  entry: readonly [string, ReadonlyArray<Finding>]
): boolean => {
  const ruleIds = entry[1].map(matchDetectorId)
  const distinct = HashSet.fromIterable(ruleIds)

  return HashSet.size(distinct) > 1
}

const collisionEvidence = (
  entry: readonly [string, ReadonlyArray<Finding>]
): EvidenceItem => {
  const ruleIds = entry[1].map(matchDetectorId)
  const distinct = HashSet.fromIterable(ruleIds)
  const idList = Array.fromIterable(distinct)
  const sortedIds = Array.sort(idList, Order.string)
  const measure = `line ${entry[0]}: ${sortedIds.join(" + ")}`

  return new EvidenceItem({ measure, count: entry[1].length })
}

const evaluateCollidingLines =
  (context: ConditionContext) =>
  (term: CollidingLines): Measurement => {
    const byLine = Array.groupBy(context.findingMatches, matchLineKey)
    const entries = Record.toEntries(byLine)
    const collisions = entries.filter(hasDistinctRules)
    const items = collisions.map(collisionEvidence)
    const evidence = Array.sort(items, byMeasure)

    return new Measurement({
      satisfied: collisions.length >= term.minimum,
      evidence
    })
  }

const evaluateDominantRule =
  (context: ConditionContext) =>
  (term: DominantRule): Measurement => {
    const isDominant = (entry: readonly [string, number]): boolean => {
      const spread = countAt(context.summary.filesByDetector)(entry[0])
      const holdsShare =
        entry[1] * term.denominator >=
        context.summary.findingTotal * term.numerator

      return [holdsShare, spread >= term.minSpread].every(Boolean)
    }

    const entries = HashMap.toEntries(context.summary.findingCounts)
    const dominant = entries.filter(isDominant)
    const items = dominant.map(entryEvidence)
    const evidence = Array.sort(items, evidenceOrder)

    return new Measurement({ satisfied: dominant.length > 0, evidence })
  }

const evaluateFindingBreakdown =
  (context: ConditionContext) =>
  (term: FindingBreakdown): Measurement => {
    const entries = HashMap.toEntries(context.summary.findingCounts)
    const items = entries.map(entryEvidence)
    const evidence = Array.sort(items, evidenceOrder)

    return new Measurement({ satisfied: evidence.length > 0, evidence })
  }

// A bare atom is AtLeast(1): it holds when at least one matching entity exists under the node.
const evaluateAtom =
  (context: ConditionContext) =>
  (matcher: Matcher): Measurement =>
    countedMeasurement(context)(matcher)(1)

export const evaluateMatcher =
  (context: ConditionContext) =>
  (matcher: Matcher): Measurement =>
    pipe(
      Match.value(matcher),
      Match.tag("And", evaluateAnd(context)),
      Match.tag("Or", evaluateOr(context)),
      Match.tag("Not", evaluateNot(context)),
      Match.tag("AtLeast", evaluateAtLeast(context)),
      Match.tag("ShareOfProject", evaluateShareOfProject(context)),
      Match.tag("FilesWithFindings", evaluateFilesWithFindings(context)),
      Match.tag("CollidingLines", evaluateCollidingLines(context)),
      Match.tag("DominantRule", evaluateDominantRule(context)),
      Match.tag("FindingBreakdown", evaluateFindingBreakdown(context)),
      Match.orElse(evaluateAtom(context))
    )

const hasObservedCount = (item: EvidenceItem): boolean => item.count > 0

// Fires when every require term holds; the diagnosis evidence is the require trace plus any non-zero observations, in declaration order.
export const evaluateSyndrome =
  (context: ConditionContext) =>
  (syndrome: Syndrome): Option.Option<Evidence> => {
    const evaluate = evaluateMatcher(context)
    const required = syndrome.require.map(evaluate)
    const fired = required.every(measurementSatisfied)

    if (!fired) {
      return Option.none()
    }

    const observed = syndrome.observe.map(evaluate)
    const requiredEvidence = required.flatMap(measurementEvidence)
    const observedItems = observed.flatMap(measurementEvidence)
    const observedEvidence = observedItems.filter(hasObservedCount)
    const evidence = requiredEvidence.concat(observedEvidence)

    return Option.some(evidence)
  }
