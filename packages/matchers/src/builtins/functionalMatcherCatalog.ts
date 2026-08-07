import { conceptControlMatcher } from "./conceptControl/conceptControlEngine.js"
import { noPassThroughObjectWrappersMatcher } from "./noPassThroughObjectWrappers.js"
import { noReexportsMatcher } from "./noReexports.js"
import { noValueAliasesMatcher } from "./noValueAliases.js"
import { preferComposedCallbacksMatcher } from "./preferComposedCallbacks.js"
import { preferConditionalReturnMatcher } from "./preferConditionalReturn.js"
import { preferDirectBooleanReturnMatcher } from "./preferDirectBooleanReturn.js"
import { preferDirectYieldMatcher } from "./preferDirectYield.js"
import { preferEtaReductionMatcher } from "./preferEtaReduction.js"
import { preferFunctionCompositionMatcher } from "./preferFunctionComposition.js"
import { preferFunctionFlipMatcher } from "./preferFunctionFlip.js"
import { preferInferredTypesMatcher } from "./preferInferredTypes.js"

export const functionalMatcherCatalog = {
  preferInferredTypesMatcher,
  preferComposedCallbacksMatcher,
  preferEtaReductionMatcher,
  preferFunctionCompositionMatcher,
  preferFunctionFlipMatcher,
  conceptControlMatcher,
  preferConditionalReturnMatcher,
  preferDirectBooleanReturnMatcher,
  preferDirectYieldMatcher,
  noPassThroughObjectWrappersMatcher,
  noReexportsMatcher,
  noValueAliasesMatcher
} as const
