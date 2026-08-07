import { Option } from "effect"
import * as ts from "typescript"
import { makeNodeMatch } from "../../matcher/makeNodeMatch.js"
import type { MatchContext } from "../../matcher/matchContext.js"
import type { ArchitectureRole } from "../../support/architectureRoleType.js"
import { FunctionalCoreBoundaryData } from "./boundaryData.js"

export const boundaryDetection = (
  _context: MatchContext,
  node: ts.Node,
  role: ArchitectureRole,
  kind: FunctionalCoreBoundaryData["kind"],
  subject: string,
  targetRole: Option.Option<ArchitectureRole> = Option.none()
) => {
  const resolvedTargetRole = Option.getOrUndefined(targetRole)

  const data = FunctionalCoreBoundaryData.make({
    kind,
    role,
    subject,
    targetRole: resolvedTargetRole
  })

  return makeNodeMatch(node, data)
}
