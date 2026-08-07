import { preferResultConceptNamesMatcher } from "./preferResultConceptNames.js"
import { preferSpecificOperationNamesMatcher } from "./preferSpecificOperationNames.js"
import { requireCallableRoleNameConsistencyMatcher } from "./requireCallableRoleNameConsistency.js"
import { requireCommandNameConsistencyMatcher } from "./requireCommandNameConsistency.js"
import { requireConstructionNameConsistencyMatcher } from "./requireConstructionNameConsistency.js"
import { requireConversionDirectionConsistencyMatcher } from "./requireConversionDirectionConsistency.js"
import { requireLookupTotalityNameConsistencyMatcher } from "./requireLookupTotalityNameConsistency.js"
import { requirePredicateNameConsistencyMatcher } from "./requirePredicateNameConsistency.js"
import { requireResultCardinalityNameConsistencyMatcher } from "./requireResultCardinalityNameConsistency.js"

export const namingMatcherCatalog = {
  preferSpecificOperationNamesMatcher,
  requireCallableRoleNameConsistencyMatcher,
  requirePredicateNameConsistencyMatcher,
  requireCommandNameConsistencyMatcher,
  requireLookupTotalityNameConsistencyMatcher,
  requireConstructionNameConsistencyMatcher,
  requireConversionDirectionConsistencyMatcher,
  preferResultConceptNamesMatcher,
  requireResultCardinalityNameConsistencyMatcher
} as const
