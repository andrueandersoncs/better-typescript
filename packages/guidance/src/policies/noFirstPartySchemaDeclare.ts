import { Function } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { oneFinding } from "@better-typescript/core/engine/policy"
import { defineBuiltinPolicy } from "../definePolicy.js"
import {
  noFirstPartySchemaDeclareMatcher,
  type NoFirstPartySchemaDeclareFact
} from "@better-typescript/matchers/builtins/noFirstPartySchemaDeclare"

const schemaDeclareHint =
  "Schema.declare is for third-party integrations and non-parametric opaque or branded types " +
  "validated by a type guard. For structural models you own, define a Schema.Struct plus a " +
  "same-named decoded interface — for example export const MyType = Schema.Struct({ ... }); " +
  "export interface MyType extends Schema.Schema.Type<typeof MyType> {} — which gives you " +
  "validation, encoding, and decoding for free."

const noFirstPartySchemaDeclareFindings = (match: Match<NoFirstPartySchemaDeclareFact>) =>
  oneFinding(
    match.target,
    `Avoid Schema.declare for the first-party structural type "${match.fact.typeName}".`,
    schemaDeclareHint,
    undefined
  )

export const noFirstPartySchemaDeclare = defineBuiltinPolicy(
  "no-first-party-schema-declare",
  noFirstPartySchemaDeclareMatcher,
  Function.constant(noFirstPartySchemaDeclareFindings)
)
