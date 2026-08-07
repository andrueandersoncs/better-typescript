import * as ts from "typescript"

export type MatcherFilePredicate = (matcherIndex: number, sourceFile: ts.SourceFile) => boolean
