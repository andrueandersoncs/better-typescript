import { helper } from "./helpers.js"

const localValue = 1

const localFunction = (): number => localValue

type LocalAlias = string

const takesIgnoredParam = (used: number, _unused: number): number => used

export const used =
  helper() + localFunction() + takesIgnoredParam(1, 2)

export type ExportedAlias = LocalAlias
