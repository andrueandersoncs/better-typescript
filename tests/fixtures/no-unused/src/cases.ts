import { helper, unusedHelper } from "./helpers.js"
import type { UnusedType } from "./helpers.js"

const unusedValue = 1

const unusedFunction = (): number => 1

type UnusedAlias = string

const takesUnusedParam = (used: number, unused: number): number => used

export const used = helper() + takesUnusedParam(1, 2)
