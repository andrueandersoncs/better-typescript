import type * as ts from "typescript"
import { Match } from "./match.js"
import { PositionTarget } from "./positionTarget.js"

export const makePositionMatch = <Fact>(
  sourceFile: ts.SourceFile,
  line: number,
  column: number,
  fact: Fact
) => {
  const target = new PositionTarget({ sourceFile, line, column })

  return new Match({ target, fact })
}
