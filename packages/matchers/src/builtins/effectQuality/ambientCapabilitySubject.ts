import * as ts from "typescript"

import type { MatchContext } from "../../matcher/matchContext.js"

import { ambientCapabilityPropertySubject } from "../functionalCoreEffect/ambientCapabilityPropertySubject.js"

export const ambientCapabilitySubject =
  (context: MatchContext) => (access: ts.PropertyAccessExpression) =>
    ambientCapabilityPropertySubject(context, access)
