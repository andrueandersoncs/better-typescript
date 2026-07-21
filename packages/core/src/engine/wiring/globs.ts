import { filter as compileFileGlob, makeRe } from "minimatch"
import type { MinimatchOptions } from "minimatch"
import { Array, Predicate, Tuple } from "effect"

const globOptions: MinimatchOptions = {
  dot: true,
  nonegate: true,
  platform: "linux"
}

export const compileGlobMatcher = (pattern: string) => {
  const excluded = pattern.startsWith("!")
  const glob = excluded ? pattern.slice(1) : pattern

  return Tuple.make(excluded, compileFileGlob(glob, globOptions))
}

// GlobMatcher is the compiled include/exclude pair because file scope must stay pure.
export type GlobMatcher = ReturnType<typeof compileGlobMatcher>

const matcherIncludesPath =
  (candidatePath: string) =>
  (matcher: GlobMatcher): boolean => {
    const excluded = Tuple.get(matcher, 0)
    const includes = Tuple.get(matcher, 1)
    const isExcluded = excluded
    const pathMatches = includes(candidatePath)
    const conditions = Array.make(!isExcluded, pathMatches)

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

const hasNonWhitespace = (pattern: string) => pattern.trim().length > 0

// One glob predicate is canonical here because config loading and defineConfig must not drift.
export const isFileGlob = Predicate.and(Predicate.isString, hasNonWhitespace)

export const makeGlobPattern = (pattern: string) => {
  makeRe(pattern, globOptions)

  return pattern
}

export const compileGlobPattern = makeGlobPattern
