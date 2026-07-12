import * as path from "node:path"
import type * as ts from "typescript"
import type { CheckContext } from "../check/data.js"
import { Detection, DetectionSource, Location } from "./data.js"

export type MakeDetection = (source: DetectionSource) => Detection

export const toRelativeFileName =
  (projectRoot: string) =>
  (fileName: string): string => {
    const relative = path.relative(projectRoot, fileName)

    return relative || fileName
  }

export const locateNode =
  (context: CheckContext) =>
  (node: ts.Node): Location => {
    const sourceFile = context.sourceFile
    const start = node.getStart(sourceFile)
    const position = sourceFile.getLineAndCharacterOfPosition(start)

    const fileName = toRelativeFileName(context.projectRoot)(
      sourceFile.fileName
    )

    return new Location({
      path: fileName,
      line: position.line + 1,
      column: position.character + 1
    })
  }

export const detection =
  (context: CheckContext): MakeDetection =>
  (source: DetectionSource): Detection => {
    const location = locateNode(context)(source.node)

    return new Detection({
      location,
      message: source.message,
      hint: source.hint,
      data: source.data
    })
  }
