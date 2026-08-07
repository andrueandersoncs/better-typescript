import { preferEffectArrayMatcher } from "./preferEffectArray.js"
import { preferEffectArrayAppendAllMatcher } from "./preferEffectArrayAppendAll.js"
import { preferEffectArrayCountByMatcher } from "./preferEffectArrayCountBy.js"
import { preferEffectIndexAccessMatcher } from "./preferEffectIndexAccess.js"
import { preferEffectRecordFilterMapMatcher } from "./preferEffectRecordFilterMap.js"
import { preferEquivalenceStrictEqualMatcher } from "./preferEquivalenceStrictEqual.js"

export const effectCollectionsMatcherCatalog = {
  preferEffectArrayMatcher,
  preferEffectArrayAppendAllMatcher,
  preferEffectArrayCountByMatcher,
  preferEffectIndexAccessMatcher,
  preferEffectRecordFilterMapMatcher,
  preferEquivalenceStrictEqualMatcher
} as const
