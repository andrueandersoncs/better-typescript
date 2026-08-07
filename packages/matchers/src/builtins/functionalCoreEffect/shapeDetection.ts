import type { MatchContext } from "../../matcher/matchContext.js"
import { makeNodeMatch } from "../../matcher/makeNodeMatch.js"
import type * as ts from "typescript"
import type { FunctionalCoreShapeData } from "./shapeData.js"

export const shapeDetection = (
  _context: MatchContext,
  node: ts.Node,
  data: FunctionalCoreShapeData
) => makeNodeMatch(node, data)
