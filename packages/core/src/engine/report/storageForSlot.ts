import { Array, Option, pipe } from "effect"
import type { MutableElementBuckets } from "./mutableElementBuckets.js"
import type { MutableSeenBuckets } from "./mutableSeenBuckets.js"

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
