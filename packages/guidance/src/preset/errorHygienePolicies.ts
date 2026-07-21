import { Array } from "effect"
import type { Policy } from "@better-typescript/core/engine/policy/data"
import { noThrow } from "../policies/noThrow.js"
import { noNewError } from "../policies/noNewError.js"
import { noErrorType } from "../policies/noErrorType.js"
import { noTryCatch } from "../policies/noTryCatch.js"
import { noUndefined } from "../policies/noUndefined.js"
import { noUnused } from "../policies/noUnused.js"
import { noVoidFunctions } from "../policies/noVoidFunctions.js"

// Member order is pinned because concatenated categories define the public report block order.
export const errorHygienePolicies: ReadonlyArray<Policy> = Array.make(
  noThrow,
  noNewError,
  noErrorType,
  noTryCatch,
  noUndefined,
  noUnused,
  noVoidFunctions
)
