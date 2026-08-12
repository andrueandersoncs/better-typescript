import { noErrorTypeMatcher } from "./noErrorType.js"
import { noNestedIfStatementsMatcher } from "./noNestedIfStatements.js"
import { noNewErrorMatcher } from "./noNewError.js"
import { noNonNullAssertionMatcher } from "./noNonNullAssertion.js"
import { noThrowMatcher } from "./noThrow.js"
import { noTryCatchMatcher } from "./noTryCatch.js"
import { noUndefinedMatcher } from "./noUndefined.js"
import { noUnsafeEffectApisMatcher } from "./noUnsafeEffectApis.js"
import { noUnusedMatcher } from "./noUnused.js"
import { noVoidFunctionsMatcher } from "./noVoidFunctions.js"
import { processEnvironmentMatcher } from "./processEnvironment.js"

export const safetyMatcherCatalog = {
  processEnvironmentMatcher,
  noUnsafeEffectApisMatcher,
  noUndefinedMatcher,
  noUnusedMatcher,
  noVoidFunctionsMatcher,
  noThrowMatcher,
  noNewErrorMatcher,
  noErrorTypeMatcher,
  noTryCatchMatcher,
  noNestedIfStatementsMatcher,
  noNonNullAssertionMatcher
} as const
