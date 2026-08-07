import { noFirstPartySchemaDeclareMatcher } from "./noFirstPartySchemaDeclare.js"
import { noInstanceofMatcher } from "./noInstanceof.js"
import { noManualTypeDispatchMatcher } from "./noManualTypeDispatch.js"
import { noMonomorphicStructGetMatcher } from "./noMonomorphicStructGet.js"
import { noRawObjectTypesMatcher } from "./noRawObjectTypes.js"
import { preferCurriedDataLastFunctionsMatcher } from "./preferCurriedDataLastFunctions.js"
import { preferHashMapMatcher } from "./preferHashMap.js"
import { preferHashSetMatcher } from "./preferHashSet.js"
import { preferOptionMatchMatcher } from "./preferOptionMatch.js"
import { preferPipeFunctionMatcher } from "./preferPipeFunction.js"
import { requireResultShapeNameConsistencyMatcher } from "./requireResultShapeNameConsistency.js"

export const dataModelMatcherCatalog = {
  preferHashMapMatcher,
  preferHashSetMatcher,
  preferCurriedDataLastFunctionsMatcher,
  preferOptionMatchMatcher,
  preferPipeFunctionMatcher,
  noFirstPartySchemaDeclareMatcher,
  noInstanceofMatcher,
  noManualTypeDispatchMatcher,
  noMonomorphicStructGetMatcher,
  noRawObjectTypesMatcher,
  requireResultShapeNameConsistencyMatcher
} as const
