import * as path from "node:path"
import { Match as EffectMatch, pipe } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import type { ProgramContext } from "@better-typescript/matchers/sources/data"
import { oneFinding } from "@better-typescript/core/engine/policy"
import type { Guidance } from "@better-typescript/core/engine/policy/data"
import {
  preferEffectSchemaRecordMatcher,
  type PreferEffectSchemaRecordFact,
  type PreferEffectSchemaRecordObjectFact,
  type PreferEffectSchemaRecordTupleFact
} from "@better-typescript/matchers/builtins/preferEffectSchemaRecord"
import { defineBuiltinPolicy } from "../definePolicy.js"

const toRelativeFileName = (projectRoot: string) => (fileName: string) => {
  const relative = path.relative(projectRoot, fileName)

  return relative || fileName
}

const tupleTypeHint =
  "Replace a constructed tuple alias with a named Effect schema record, for example " +
  "export const Example = Schema.Struct({ myString: Schema.String, myNumber: " +
  "Schema.Number }); export interface Example extends Schema.Schema.Type<typeof Example> {}. " +
  "Keep a tuple only when its positions are inherently meaningful; process-bound runtime values " +
  "remain boundary types or explicit runtime data."

const preferEffectSchemaRecordGuidance: Guidance<PreferEffectSchemaRecordFact> =
  (context: ProgramContext) => (match: Match<PreferEffectSchemaRecordFact>) => {
    const tupleFindings = (fact: PreferEffectSchemaRecordTupleFact) =>
      oneFinding(
        match.target,
        `Avoid declaring ${fact.typeName} as a tuple type alias.`,
        tupleTypeHint,
        match.fact
      )

    const objectFindings = (fact: PreferEffectSchemaRecordObjectFact) => {
      const toExampleFile = toRelativeFileName(context.projectRoot)
      const exampleFile = toExampleFile(fact.constructionFileName)

      return oneFinding(
        match.target,
        `Avoid declaring ${fact.typeName} as ${fact.kindLabel} when this project constructs ` +
          "its values.",
        `Object literals of this shape are built in ${exampleFile}, so ${fact.typeName} is a ` +
          "data definition rather than a boundary type. Define it as an Effect schema " +
          "record — export const " +
          `${fact.typeName} = Schema.Struct({ ... }); export interface ${fact.typeName} extends ` +
          `Schema.Schema.Type<typeof ${fact.typeName}> {}. Construct trusted values with ` +
          `${fact.typeName}.make({ ... }) and decode unknown input at the boundary. Use ` +
          "Schema.TaggedErrorClass only for typed errors; keep process-bound runtime values " +
          "as boundary types or explicit runtime data.",
        match.fact
      )
    }

    return pipe(
      EffectMatch.value(match.fact),
      EffectMatch.when({ kind: "tuple" }, tupleFindings),
      EffectMatch.when({ kind: "object" }, objectFindings),
      EffectMatch.exhaustive
    )
  }

export const preferEffectSchemaRecord = defineBuiltinPolicy(
  "prefer-effect-schema-record",
  preferEffectSchemaRecordMatcher,
  preferEffectSchemaRecordGuidance
)
