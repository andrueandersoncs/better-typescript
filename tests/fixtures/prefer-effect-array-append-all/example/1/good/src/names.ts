import { Array } from "effect"

declare const hasPrefix: boolean
declare const prefixNames: ReadonlyArray<string>
declare const mainNames: ReadonlyArray<string>

export const names = Array.appendAll(
  hasPrefix ? prefixNames : [],
  mainNames
)
