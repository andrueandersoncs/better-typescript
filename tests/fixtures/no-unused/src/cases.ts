import { helper, unusedHelper } from "./helpers.js" // ~detect 18
import type { UnusedType } from "./helpers.js" // ~detect 1

const unusedValue = 1 // ~detect 7

const unusedFunction = (): number => 1 // ~detect 7

type UnusedAlias = string // ~detect 6

const takesUnusedParam = (used: number, unused: number): number => used // ~detect 41

export const used = helper() + takesUnusedParam(1, 2)
