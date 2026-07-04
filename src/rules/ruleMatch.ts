import * as path from "node:path"
import { Schema } from "effect"
import type * as ts from "typescript"
import { TsNode } from "./tsSchema.js"
import { Finding } from "./types.js"
import type { RuleContext } from "./types.js"

const emptySourceFacets = (): ReadonlyArray<string> => []

const sourceFacetListSchema = Schema.Array(Schema.String)

const sourceFacetsSchema = Schema.optionalWith(sourceFacetListSchema, {
  default: emptySourceFacets
})

export class MatchSource extends Schema.Class<MatchSource>("MatchSource")({
  ruleId: Schema.String,
  node: TsNode,
  message: Schema.String,
  hint: Schema.String,
  facets: sourceFacetsSchema
}) {}

type MatchSourceFields = Pick<
  MatchSource,
  "ruleId" | "node" | "message" | "hint"
> &
  Partial<Pick<MatchSource, "facets">>

export type CreateMatch = (source: MatchSourceFields) => Finding

// fileName is derived lazily per match, not in the context stage: the stage runs for every (rule, file) pair while matches are rare, so eager path.relative regresses the whole pass.
export const createRuleMatch = (context: RuleContext): CreateMatch => {
  const sourceFile = context.sourceFile
  const relativeFileName = toRelativeFileName(context.projectRoot)
  const match = (source: MatchSourceFields): Finding => {
    const start = source.node.getStart(sourceFile)
    const location = sourceFile.getLineAndCharacterOfPosition(start)
    const fileName = relativeFileName(sourceFile.fileName)

    return new Finding({
      detectorId: source.ruleId,
      path: fileName,
      line: location.line + 1,
      column: location.character + 1,
      message: source.message,
      hint: source.hint,
      facets: source.facets ?? []
    })
  }

  return match
}

export const toRelativeFileName =
  (projectRoot: string) =>
  (fileName: string): string => {
    const relative = path.relative(projectRoot, fileName)

    return relative || fileName
  }
