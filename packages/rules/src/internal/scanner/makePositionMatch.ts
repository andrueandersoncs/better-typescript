import type * as ts from "typescript"
import { PositionTarget } from "@better-typescript/core/linter"
import { Match } from "./match.js"

export const makePositionMatch =
  <Fact>(fact: Fact) =>
  (position: number) =>
  (sourceFile: ts.SourceFile) => {
    const target = PositionTarget.make({ sourceFile, position })

    return new Match({ target, fact })
  }
