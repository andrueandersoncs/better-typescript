import { Array, HashMap, Option, Schema, pipe } from "effect"
import { Finding } from "../rules/index.js"
import type { DetectorRole } from "../rules/types.js"

const countsSchema = Schema.HashMapFromSelf({
  key: Schema.String,
  value: Schema.Int
})

// The monoid the whole interpreter folds with: every field combines associatively, so file summaries merge into directory and project summaries in one pass (see adrs/0001-layered-match-interpretation.md). countsByDetector indexes every finding of every role — FindingOf reads it, so signals and advice are consumable exactly like rule findings; the finding-role fields keep gate-semantics atoms (AnyFinding, DominantRule, FilesWithFindings) counting only what users must fix.
export class Summary extends Schema.Class<Summary>("Summary")({
  findingTotal: Schema.Int,
  fileCount: Schema.Int,
  countsByDetector: countsSchema,
  findingCounts: countsSchema,
  countsByFacet: countsSchema,
  filesByDetector: countsSchema
}) {}

const noCounts: HashMap.HashMap<string, number> = HashMap.empty()

export const emptySummary = new Summary({
  findingTotal: 0,
  fileCount: 0,
  countsByDetector: noCounts,
  findingCounts: noCounts,
  countsByFacet: noCounts,
  filesByDetector: noCounts
})

const zeroCount = (): number => 0

export const countAt =
  (counts: HashMap.HashMap<string, number>) =>
  (key: string): number =>
    pipe(HashMap.get(counts, key), Option.getOrElse(zeroCount))

const addCountEntry = (
  accumulator: HashMap.HashMap<string, number>,
  value: number,
  key: string
): HashMap.HashMap<string, number> => {
  const current = countAt(accumulator)(key)

  return HashMap.set(accumulator, key, current + value)
}

const mergeCounts = (
  left: HashMap.HashMap<string, number>,
  right: HashMap.HashMap<string, number>
): HashMap.HashMap<string, number> => HashMap.reduce(right, left, addCountEntry)

export const combineSummaries = (left: Summary, right: Summary): Summary => {
  const countsByDetector = mergeCounts(
    left.countsByDetector,
    right.countsByDetector
  )
  const findingCounts = mergeCounts(left.findingCounts, right.findingCounts)
  const countsByFacet = mergeCounts(left.countsByFacet, right.countsByFacet)
  const filesByDetector = mergeCounts(
    left.filesByDetector,
    right.filesByDetector
  )

  return new Summary({
    findingTotal: left.findingTotal + right.findingTotal,
    fileCount: left.fileCount + right.fileCount,
    countsByDetector,
    findingCounts,
    countsByFacet,
    filesByDetector
  })
}

export type RoleLookup = (detectorId: string) => DetectorRole

export const facetKey =
  (detectorId: string) =>
  (facet: string): string =>
    `${detectorId}/${facet}`

const addFacetEntry =
  (detectorId: string) =>
  (
    counts: HashMap.HashMap<string, number>,
    facet: string
  ): HashMap.HashMap<string, number> => {
    const key = facetKey(detectorId)(facet)

    return addCountEntry(counts, 1, key)
  }

const addFindingToSummary =
  (roleOf: RoleLookup) =>
  (summary: Summary, finding: Finding): Summary => {
    const countsByDetector = addCountEntry(
      summary.countsByDetector,
      1,
      finding.detectorId
    )
    const isFindingRole = roleOf(finding.detectorId) === "finding"

    if (!isFindingRole) {
      return new Summary({ ...summary, countsByDetector })
    }

    const findingCounts = addCountEntry(
      summary.findingCounts,
      1,
      finding.detectorId
    )
    const countsByFacet = finding.facets.reduce(
      addFacetEntry(finding.detectorId),
      summary.countsByFacet
    )

    return new Summary({
      ...summary,
      findingTotal: summary.findingTotal + 1,
      countsByDetector,
      findingCounts,
      countsByFacet
    })
  }

const presentDetectorEntry = (
  detectorId: string
): readonly [string, number] => [detectorId, 1]

export const summarizeFileFindings =
  (roleOf: RoleLookup) =>
  (findings: ReadonlyArray<Finding>): Summary => {
    const base = findings.reduce(addFindingToSummary(roleOf), emptySummary)
    const findingDetectorIds = HashMap.keys(base.findingCounts)
    const idList = Array.fromIterable(findingDetectorIds)
    const entries = Array.map(idList, presentDetectorEntry)
    const filesByDetector = HashMap.fromIterable(entries)
    const fileCount = base.findingTotal > 0 ? 1 : 0

    return new Summary({ ...base, fileCount, filesByDetector })
  }
