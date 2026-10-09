import fc from "fast-check"
import { describe, it } from "vitest"
import { mergeIntervals, type Interval } from "./intervals"

const intervalArb: fc.Arbitrary<Interval> = fc
  .tuple(fc.integer({ min: 0, max: 10_000 }), fc.integer({ min: 0, max: 500 }))
  .map(([start, length]) => ({ start, end: start + length }))

const isSortedAndDisjoint = (intervals: ReadonlyArray<Interval>): boolean =>
  intervals.every((interval, i) => i === 0 || intervals[i - 1]!.end < interval.start)

const covers = (merged: ReadonlyArray<Interval>, point: number): boolean =>
  merged.some((interval) => interval.start <= point && point <= interval.end)

describe("mergeIntervals", () => {
  it("returns sorted, disjoint intervals that cover every input", () => {
    const property = fc.property(fc.array(intervalArb, { maxLength: 40 }), (input) => {
      const merged = mergeIntervals(input)
      if (!isSortedAndDisjoint(merged)) return false
      return input.every((interval) => covers(merged, interval.start) && covers(merged, interval.end))
    })
    try {
      fc.assert(property, { numRuns: 500 })
    } catch (error) {
      throw new Error("mergeIntervals produced overlapping or incomplete output", { cause: error })
    }
  })
})
