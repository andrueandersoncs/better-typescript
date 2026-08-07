import type * as ts from "typescript"
import { Data } from "effect"

// FileTarget pins a fact to one source file because file-level policies have no single node.
export class FileTarget extends Data.TaggedClass("FileTarget")<{
  readonly sourceFile: ts.SourceFile
}> {}
