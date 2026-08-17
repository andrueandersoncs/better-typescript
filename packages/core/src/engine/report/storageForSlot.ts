import { Array, Option, pipe } from "effect"
import { makeElementBuckets } from "./emptyElementBuckets.js"
import { makeSeenBuckets } from "./emptySeenBuckets.js"

export const storageForSlot = (
  seenByWiring: ReadonlyArray<ReturnType<typeof makeSeenBuckets>>,
  elementsByWiring: ReadonlyArray<ReturnType<typeof makeElementBuckets>>,
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
    Option.flatMap(({ seenBuckets, elementBuckets }) => {
      const maybeSeen = Array.get(seenBuckets, policyIndex)
      const maybeElements = Array.get(elementBuckets, policyIndex)

      return Option.all({ seen: maybeSeen, elements: maybeElements })
    })
  )
}
