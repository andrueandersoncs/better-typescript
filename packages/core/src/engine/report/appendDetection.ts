import { Array, Equal, HashMap, MutableList, Option, flow, pipe } from "effect"
import type { Detection } from "../location/detectionData.js"
import { noDetections } from "./emptyDetectionsBucket.js"

const detectionDedupeParts = (element: Detection) =>
  Array.make(
    element.location.path,
    element.location.line,
    element.location.column,
    element.message,
    element.hint
  )

const detectionDedupeKey = flow(detectionDedupeParts, JSON.stringify)

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
