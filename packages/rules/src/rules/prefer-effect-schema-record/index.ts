import { preferEffectSchemaRecordScanner } from "./preferEffectSchemaRecord.js"

import { pipe, Match as EffectMatch } from "effect"

import * as path from "node:path"

import type { RuleMessage } from "../../internal/rule/ruleMessage.js"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import type { ProgramContext } from "../../internal/sources/data.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const makePreferEffectSchemaRecord = () => {
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

  const preferEffectSchemaRecordRuleMessage: RuleMessage<
    typeof preferEffectSchemaRecordScanner extends Scanner<infer Fact> ? Fact : never
  > =
    (context: ProgramContext) =>
    (
      match: Match<
        typeof preferEffectSchemaRecordScanner extends Scanner<infer Fact> ? Fact : never
      >
    ) => {
      const makeTupleFindings = (
        fact: Extract<
          typeof preferEffectSchemaRecordScanner extends Scanner<infer Fact> ? Fact : never,
          { readonly kind: "tuple" }
        >
      ) => makeRuleMessage(`Avoid declaring ${fact.typeName} as a tuple type alias.`, tupleTypeHint)

      const makeObjectFindings = (
        fact: Extract<
          typeof preferEffectSchemaRecordScanner extends Scanner<infer Fact> ? Fact : never,
          { readonly kind: "object" }
        >
      ) => {
        const toExampleFile = toRelativeFileName(context.projectRoot)
        const exampleFile = toExampleFile(fact.constructionFileName)

        return makeRuleMessage(
          `Avoid declaring ${fact.typeName} as ${fact.kindLabel} when this project constructs ` +
            "its values.",
          `Object literals of this shape are built in ${exampleFile}, so ${fact.typeName} is a ` +
            "data scan rather than a boundary type. Define it as an Effect schema " +
            "record — export const " +
            `${fact.typeName} = Schema.Struct({ ... }); export interface ${fact.typeName} extends ` +
            `Schema.Schema.Type<typeof ${fact.typeName}> {}. Construct trusted values with ` +
            `${fact.typeName}.make({ ... }) and decode unknown input at the boundary. Use ` +
            "Schema.TaggedErrorClass only for typed errors; keep process-bound runtime values " +
            "as boundary types or explicit runtime data."
        )
      }

      return pipe(
        EffectMatch.value(match.fact),
        EffectMatch.when({ kind: "tuple" }, makeTupleFindings),
        EffectMatch.when({ kind: "object" }, makeObjectFindings),
        EffectMatch.exhaustive
      )
    }

  const preferEffectSchemaRecord = makeRule("prefer-effect-schema-record")(
    preferEffectSchemaRecordScanner
  )(preferEffectSchemaRecordRuleMessage)

  return preferEffectSchemaRecord
}

export const preferEffectSchemaRecord = makePreferEffectSchemaRecord()
