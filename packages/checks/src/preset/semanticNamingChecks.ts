import { Array } from "effect"
import type { NamedCheck } from "@better-typescript/core/engine/wiring/data"

import { preferResultConceptNames } from "../checks/preferResultConceptNames.js"
import { requirePredicateNameConsistency } from "../checks/requirePredicateNameConsistency.js"
import { requireConstructionNameConsistency } from "../checks/requireConstructionNameConsistency.js"
import { requireLookupTotalityNameConsistency } from "../checks/requireLookupTotalityNameConsistency.js"
import { requireResultCardinalityNameConsistency } from "../checks/requireResultCardinalityNameConsistency.js"
import { requireResultShapeNameConsistency } from "../checks/requireResultShapeNameConsistency.js"
import { requireConversionDirectionConsistency } from "../checks/requireConversionDirectionConsistency.js"
import { requireCommandNameConsistency } from "../checks/requireCommandNameConsistency.js"
import { requireCallableRoleNameConsistency } from "../checks/requireCallableRoleNameConsistency.js"
import { preferSpecificOperationNames } from "../checks/preferSpecificOperationNames.js"

export const semanticNamingChecks: ReadonlyArray<NamedCheck> = Array.make(
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
