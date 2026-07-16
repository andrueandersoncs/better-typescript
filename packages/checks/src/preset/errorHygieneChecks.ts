import { Array } from "effect"
import { noThrow } from "../checks/noThrow.js"
import { noNewError } from "../checks/noNewError.js"
import { noErrorType } from "../checks/noErrorType.js"
import { noTryCatch } from "../checks/noTryCatch.js"
import { noUndefined } from "../checks/noUndefined.js"
import { noUnused } from "../checks/noUnused.js"
import { noVoidFunctions } from "../checks/noVoidFunctions.js"
import type { NamedCheck } from "@better-typescript/core/engine/wiring/data"

// Member order is pinned because concatenated categories define the public report block order.
export const errorHygieneChecks: ReadonlyArray<NamedCheck> = Array.make(
  noThrow,
  noNewError,
  noErrorType,
  noTryCatch,
  noUndefined,
  noUnused,
  noVoidFunctions
)
