import { Option, Tuple } from "effect"
import * as ts from "typescript"

export const annotationEdit =
  (sourceFile: ts.SourceFile) => (anchorEnd: number) => (typeNode: ts.TypeNode) => {
    const typeStart = typeNode.getStart(sourceFile)
    const colon = sourceFile.text.lastIndexOf(":", typeStart - 1)
    const validColon = colon >= anchorEnd
    const edit = Tuple.make(colon, typeNode.end, "")

    return validColon ? Option.some(edit) : Option.none()
  }
