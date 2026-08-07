import { Array } from "effect"
import type { Subscription } from "@better-typescript/matchers/matcher/subscription"
import type { ProgramContext } from "@better-typescript/matchers/sources/data"

export const emptyPlan = (_context: ProgramContext): ReadonlyArray<Subscription> => Array.empty()
