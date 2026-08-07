import { noArraySpreadMatcher } from "./noArraySpread.js"
import { noAsyncFunctionsMatcher } from "./noAsyncFunctions.js"
import { noCallbacksMatcher } from "./noCallbacks.js"
import { noForInLoopsMatcher } from "./noForInLoops.js"
import { noForLoopsMatcher } from "./noForLoops.js"
import { noForOfLoopsMatcher } from "./noForOfLoops.js"
import { noFunctionKeywordMatcher } from "./noFunctionKeyword.js"
import { noInlineClosuresMatcher } from "./noInlineClosures.js"
import { noNestedCallsMatcher } from "./noNestedCalls.js"
import { noPrimitiveArrayConstructorsMatcher } from "./noPrimitiveArrayConstructors.js"
import { preferImplicitReturnMatcher } from "./preferImplicitReturn.js"
import { noSwitchStatementsMatcher } from "./noSwitchStatements.js"

export const controlFlowMatcherCatalog = {
  noArraySpreadMatcher,
  noPrimitiveArrayConstructorsMatcher,
  noCallbacksMatcher,
  noAsyncFunctionsMatcher,
  noSwitchStatementsMatcher,
  noFunctionKeywordMatcher,
  noInlineClosuresMatcher,
  noNestedCallsMatcher,
  noForInLoopsMatcher,
  noForLoopsMatcher,
  preferImplicitReturnMatcher,
  noForOfLoopsMatcher
} as const
