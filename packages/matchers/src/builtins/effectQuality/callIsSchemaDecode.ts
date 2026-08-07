import { Array, Option, pipe } from "effect"

import * as ts from "typescript"

import { strictEqual } from "@better-typescript/matchers/equivalence"

import type { ImportedMember } from "../functionalCoreEffect/importedMember.js"

import { callIsImportedApi } from "./callIsImportedApi.js"

import { memberLastName } from "./memberLastName.js"

import { schemaDecodeNames } from "./schemaDecodeNames.js"

const moduleIsEffectSchema = (moduleSpecifier: string) => {
  const fromBarrel = strictEqual("effect")(moduleSpecifier)
  const fromSchema = strictEqual("effect/Schema")(moduleSpecifier)
  const fromSchemaNested = moduleSpecifier.startsWith("effect/Schema/")
  const flags = Array.make(fromBarrel, fromSchema, fromSchemaNested)

  return Array.some(flags, Boolean)
}

const memberIsSchemaDecodeApi = (member: ImportedMember) => {
  const schemaModule = moduleIsEffectSchema(member.moduleSpecifier)
  const last = memberLastName(member)
  const nameMatches = Array.contains(schemaDecodeNames, last)
  const fromEffectBarrel = strictEqual("effect")(member.moduleSpecifier)
  const schemaPathHead = Array.get(member.path, 0)
  const barrelSchemaPath = pipe(schemaPathHead, Option.contains("Schema"))
  const pathOk = fromEffectBarrel ? barrelSchemaPath : true
  const flags = Array.make(schemaModule, nameMatches, pathOk)

  return Array.every(flags, Boolean)
}

export const callIsSchemaDecode = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  callIsImportedApi(memberIsSchemaDecodeApi)(checker)(call.expression)
