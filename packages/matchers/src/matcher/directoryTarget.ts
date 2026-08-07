import type * as ts from "typescript"
import { Data } from "effect"

// DirectoryTarget groups source files under one path because directory policies span many files.
export class DirectoryTarget extends Data.TaggedClass("DirectoryTarget")<{
  readonly path: string
  readonly sourceFiles: ReadonlyArray<ts.SourceFile>
}> {}
