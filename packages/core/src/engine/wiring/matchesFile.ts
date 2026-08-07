import { Array, Tuple } from "effect"
import type { GlobMatcher } from "./globMatcher.js"

const matcherIncludesPath =
  (candidatePath: string) =>
  (matcher: GlobMatcher): boolean => {
    const excluded = Tuple.get(matcher, 0)
    const includes = Tuple.get(matcher, 1)
    const pathMatches = includes(candidatePath)
    const conditions = Array.make(!excluded, pathMatches)

    return Array.every(conditions, Boolean)
  }

const matcherExcludesPath =
  (candidatePath: string) =>
  (matcher: GlobMatcher): boolean => {
    const excluded = Tuple.get(matcher, 0)
    const includes = Tuple.get(matcher, 1)
    const pathMatches = includes(candidatePath)
    const conditions = Array.make(excluded, pathMatches)

    return Array.every(conditions, Boolean)
  }

export const matchesFile =
  (matchers: ReadonlyArray<GlobMatcher>) =>
  (candidatePath: string): boolean => {
    const isIncluded = Array.some(matchers, matcherIncludesPath(candidatePath))
    const isExcluded = Array.some(matchers, matcherExcludesPath(candidatePath))
    const notExcluded = !isExcluded
    const conditions = Array.make(isIncluded, notExcluded)

    return Array.every(conditions, Boolean)
  }
