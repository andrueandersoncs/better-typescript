import { Array, pipe } from "effect"
import type { Target } from "@better-typescript/matchers/matcher/workspaceTarget"
import { FindingSource } from "./findingSource.js"

export const makeFindings = (
  target: Target,
  message: string,
  hint: string,
  data: unknown
): ReadonlyArray<FindingSource> =>
  pipe(new FindingSource({ target, message, hint, data }), Array.of)
