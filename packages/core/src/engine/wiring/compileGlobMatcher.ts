import { filter as compileFileGlob } from "minimatch"
import type { MinimatchOptions } from "minimatch"
import { Tuple } from "effect"

export const globOptions: MinimatchOptions = {
  dot: true,
  nonegate: true,
  platform: "linux"
}

export const compileGlobMatcher = (pattern: string) => {
  const excluded = pattern.startsWith("!")
  const glob = excluded ? pattern.slice(1) : pattern

  return Tuple.make(excluded, compileFileGlob(glob, globOptions))
}
