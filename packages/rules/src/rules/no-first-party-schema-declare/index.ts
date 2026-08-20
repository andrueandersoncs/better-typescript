import { noFirstPartySchemaDeclareScanner } from "./noFirstPartySchemaDeclare.js"

import { Function } from "effect"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const makeNoFirstPartySchemaDeclare = () => {
  const schemaDeclareHint =
    "Schema.declare is for third-party integrations and non-parametric opaque or branded types " +
    "validated by a type guard. For structural models you own, define a Schema.Struct plus a " +
    "same-named decoded interface — for example export const MyType = Schema.Struct({ ... }); " +
    "export interface MyType extends Schema.Schema.Type<typeof MyType> {} — which gives you " +
    "validation, encoding, and decoding for free."

  const makeNoFirstPartySchemaDeclareFindings = (
    match: Match<typeof noFirstPartySchemaDeclareScanner extends Scanner<infer Fact> ? Fact : never>
  ) =>
    makeRuleMessage(
      `Avoid Schema.declare for the first-party structural type "${match.fact.typeName}".`,
      schemaDeclareHint
    )

  const noFirstPartySchemaDeclare = makeRule("no-first-party-schema-declare")(
    noFirstPartySchemaDeclareScanner
  )(Function.constant(makeNoFirstPartySchemaDeclareFindings))

  return noFirstPartySchemaDeclare
}

export const noFirstPartySchemaDeclare = makeNoFirstPartySchemaDeclare()
