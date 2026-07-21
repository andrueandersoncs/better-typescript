import { Array, Equal, Function, HashMap, MutableList, Option, pipe } from "effect"
import type { Detection } from "../location/data.js"
import type { WiringEntry } from "./data.js"
import { matchesFile, type GlobMatcher } from "./globs.js"
import * as path from "node:path"

const emptyDetections: ReadonlyArray<Detection> = Array.empty()
const noDetections = Function.constant(emptyDetections)

// MutableSeenBuckets is the per-policy dedupe map because collection mutates across projects.
export type MutableSeenBuckets = ReadonlyArray<HashMap.HashMap<string, ReadonlyArray<Detection>>>

// MutableElementBuckets is the per-policy list because collection mutates across projects.
export type MutableElementBuckets = ReadonlyArray<MutableList.MutableList<Detection>>

export const emptySeenBuckets = (entry: WiringEntry) =>
  Array.makeBy(entry.wiring.policies.length, () =>
    pipe(HashMap.empty<string, ReadonlyArray<Detection>>(), HashMap.beginMutation)
  )

export const emptyElementBuckets = (entry: WiringEntry) =>
  Array.makeBy(entry.wiring.policies.length, () => MutableList.make<Detection>())

export const relativeWorkspacePath = (
  workspaceRoot: string,
  projectRoot: string,
  candidatePath: string
) => {
  const absoluteCandidatePath = path.resolve(projectRoot, candidatePath)

  return path.relative(workspaceRoot, absoluteCandidatePath).replaceAll(path.sep, "/")
}

const detectionDedupeKey = (element: Detection) => {
  const location = element.location

  const dedupeKeyParts = Array.make(
    location.path,
    location.line,
    location.column,
    element.message,
    element.hint
  )

  return JSON.stringify(dedupeKeyParts)
}

export const appendDetection =
  (
    seen: HashMap.HashMap<string, ReadonlyArray<Detection>>,
    elements: MutableList.MutableList<Detection>
  ) =>
  (element: Detection): boolean => {
    const key = detectionDedupeKey(element)
    const maybeBucket = HashMap.get(seen, key)
    const bucket = pipe(maybeBucket, Option.getOrElse(noDetections))
    const hasSameData = (candidate: Detection) => Equal.equals(candidate.data, element.data)
    const alreadySeen = Array.some(bucket, hasSameData)
    const expandedBucket = Array.append(bucket, element)
    const shouldStore = !alreadySeen

    if (shouldStore) {
      HashMap.set(seen, key, expandedBucket)
      MutableList.append(elements, element)
    }

    return shouldStore
  }

export const detectionIsIncluded =
  (workspaceRoot: string, projectRoot: string, matchers: ReadonlyArray<GlobMatcher>) =>
  (element: Detection) => {
    const detectionPath = relativeWorkspacePath(workspaceRoot, projectRoot, element.location.path)
    const isIncluded = matchesFile(matchers)

    return isIncluded(detectionPath)
  }

export const appendIncludedDetections = (
  workspaceRoot: string,
  projectRoot: string,
  matchers: ReadonlyArray<GlobMatcher>,
  seen: HashMap.HashMap<string, ReadonlyArray<Detection>>,
  elements: MutableList.MutableList<Detection>,
  detections: ReadonlyArray<Detection>
) => {
  const isIncluded = detectionIsIncluded(workspaceRoot, projectRoot, matchers)
  const includedDetections = Array.filter(detections, isIncluded)
  const append = appendDetection(seen, elements)

  Array.forEach(includedDetections, append)

  return includedDetections.length
}

export const storageForSlot = (
  seenByWiring: ReadonlyArray<MutableSeenBuckets>,
  elementsByWiring: ReadonlyArray<MutableElementBuckets>,
  wiringIndex: number,
  policyIndex: number
) => {
  const maybeSeenBuckets = Array.get(seenByWiring, wiringIndex)
  const maybeElementBuckets = Array.get(elementsByWiring, wiringIndex)

  const maybeBuckets = Option.all({
    seenBuckets: maybeSeenBuckets,
    elementBuckets: maybeElementBuckets
  })

  return pipe(
    maybeBuckets,
    Option.flatMap((buckets) => {
      const maybeSeen = Array.get(buckets.seenBuckets, policyIndex)
      const maybeElements = Array.get(buckets.elementBuckets, policyIndex)

      return Option.all({ seen: maybeSeen, elements: maybeElements })
    })
  )
}

export { noDetections }
