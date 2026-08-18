import type * as ts from "typescript"
import { Match } from "./match.js"
import { PositionTarget } from "./positionTarget.js"

export const makePositionMatch =
  <Fact>(fact: Fact) =>
  (line: number) =>
  (column: number) =>
  (sourceFile: ts.SourceFile) => {
    const target = new PositionTarget({ sourceFile, line, column })

    return new Match({ target, fact })
  }
