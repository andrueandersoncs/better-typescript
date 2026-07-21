import { Array, Function, Option, pipe, flow } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import { unwrapCallee } from "../../support/tsNode.js"
import {
  ImportedMember,
  importedMemberAt,
  declarationsOfSymbol,
  emptyHeritageClauses
} from "./importedMembers.js"

export const specifierIsEffect = strictEqual("effect")

export const effectApiMember = (
  member: ImportedMember,
  namespace: string,
  names: ReadonlyArray<string>
) => {
  const lastOption = Array.last(member.path)
  const last = pipe(lastOption, Option.getOrElse(Function.constant("")))
  const pathHead = Array.get(member.path, 0)
  const fromBarrelPath = pipe(pathHead, Option.contains(namespace))
  const fromEffectBarrel = strictEqual("effect")(member.moduleSpecifier)
  const fromBarrel = fromEffectBarrel && fromBarrelPath
  const fromSubpath = strictEqual(`effect/${namespace}`)(member.moduleSpecifier)
  const fromEffectModule = fromBarrel || fromSubpath
  const nameMatches = Array.contains(names, last)
  const matchFlags = Array.make(fromEffectModule, nameMatches)

  return Array.every(matchFlags, Boolean)
}

export const importedEffectApiAt = (
  checker: ts.TypeChecker,
  expression: ts.Expression,
  namespace: string,
  names: ReadonlyArray<string>
) => {
  const effectApiMemberOf = (member: ImportedMember) => effectApiMember(member, namespace, names)
  return pipe(importedMemberAt(checker, expression), Option.exists(effectApiMemberOf))
}

const isEffectManagedRuntimeSource = (sourceFile: ts.SourceFile) => {
  const normalized = sourceFile.fileName.replaceAll("\\", "/")

  const installed =
    normalized.includes("/node_modules/effect/") && normalized.endsWith("/ManagedRuntime.d.ts")

  const vendored = normalized.endsWith("/packages/effect/src/ManagedRuntime.ts")

  return installed || vendored
}

const declarationSourceFile = (declaration: ts.Declaration) => declaration.getSourceFile()
const declarationFromManagedRuntime = flow(declarationSourceFile, isEffectManagedRuntimeSource)

const someManagedRuntimeSource = (declarations: ReadonlyArray<ts.Declaration>) =>
  Array.some(declarations, declarationFromManagedRuntime)

export const isManagedRuntimeMethodAccess = (
  checker: ts.TypeChecker,
  node: ts.PropertyAccessExpression,
  names: ReadonlyArray<string>
) => {
  const nameMatches = Array.contains(names, node.name.text)

  const managedRuntime = pipe(
    node.name,
    (nameNode) => checker.getSymbolAtLocation(nameNode),
    Option.fromNullishOr,
    Option.map(declarationsOfSymbol),
    Option.exists(someManagedRuntimeSource)
  )

  const matchFlags = Array.make(nameMatches, managedRuntime)

  return Array.every(matchFlags, Boolean)
}

export const classExtendsEffectApi = (
  checker: ts.TypeChecker,
  declaration: ts.ClassDeclaration,
  namespace: string,
  memberName: string
) => {
  const clauses = declaration.heritageClauses ?? emptyHeritageClauses
  const names = Array.of(memberName)

  const someHeritageType = (clause: ts.HeritageClause) =>
    Array.some(clause.types, (heritage) => {
      const callee = unwrapCallee(heritage.expression)
      return importedEffectApiAt(checker, callee, namespace, names)
    })

  return Array.some(clauses, someHeritageType)
}
