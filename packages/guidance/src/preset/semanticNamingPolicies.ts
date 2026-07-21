import { Array } from "effect"
import type { Policy } from "@better-typescript/core/engine/policy/data"
import { preferResultConceptNames } from "../policies/preferResultConceptNames.js"
import { requirePredicateNameConsistency } from "../policies/requirePredicateNameConsistency.js"
import { requireConstructionNameConsistency } from "../policies/requireConstructionNameConsistency.js"
import { requireLookupTotalityNameConsistency } from "../policies/requireLookupTotalityNameConsistency.js"
import { requireResultCardinalityNameConsistency } from "../policies/requireResultCardinalityNameConsistency.js"
import { requireResultShapeNameConsistency } from "../policies/requireResultShapeNameConsistency.js"
import { requireConversionDirectionConsistency } from "../policies/requireConversionDirectionConsistency.js"
import { requireCommandNameConsistency } from "../policies/requireCommandNameConsistency.js"
import { requireCallableRoleNameConsistency } from "../policies/requireCallableRoleNameConsistency.js"
import { preferSpecificOperationNames } from "../policies/preferSpecificOperationNames.js"

export const semanticNamingPolicies: ReadonlyArray<Policy> = Array.make(
  preferResultConceptNames,
  requirePredicateNameConsistency,
  requireConstructionNameConsistency,
  requireLookupTotalityNameConsistency,
  requireResultCardinalityNameConsistency,
  requireResultShapeNameConsistency,
  requireConversionDirectionConsistency,
  requireCommandNameConsistency,
  requireCallableRoleNameConsistency,
  preferSpecificOperationNames
)
