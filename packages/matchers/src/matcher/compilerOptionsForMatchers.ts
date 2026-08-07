import * as ts from "typescript"
import { Matcher } from "./matcherData.js"
import { Array } from "effect"

export const compilerOptionsForMatchers = (matchers: ReadonlyArray<Matcher>) =>
  Array.reduce(matchers, {} as ts.CompilerOptions, (options, matcher) =>
    Object.assign(options, matcher.compilerOptions)
  )
