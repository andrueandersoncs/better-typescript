import type * as ts from "typescript"
import { Predicate, Schema } from "effect"

export const isTsSourceFile = (input: unknown): input is ts.SourceFile =>
  Predicate.hasProperty(input, "languageVersion")

// TsSourceFile is the shared SourceFile schema because owners need one vocabulary.
export const TsSourceFile = Schema.declare(isTsSourceFile, {
  identifier: "ts.SourceFile"
})
