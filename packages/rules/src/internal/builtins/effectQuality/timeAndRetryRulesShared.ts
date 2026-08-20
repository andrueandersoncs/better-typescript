import { effectVitestModules } from "./effectVitestModules.js"
import { Array, Option, Struct, flow, pipe } from "effect"

import * as ts from "typescript"

import { strictEqual } from "../../equivalence.js"

import { callExpressionOf } from "../../support/callExpressionOf.js"

import type { ImportedMember } from "../../support/effectApi/importedMember.js"

import { importedMemberAt } from "../../support/effectApi/importedMemberAt.js"

import { unwrapCallee } from "../../support/unwrapCallee.js"

import { hasAncestor } from "./effectApiFacts.js"

export const sleepNames = Array.of("sleep")

export const effectVitestMember = ({ moduleSpecifier, path }: ImportedMember) => {
  const candidateMatchesModule = (candidate: string) => {
    const matchesModule = strictEqual(candidate)(moduleSpecifier)
    const matchesSubpath = moduleSpecifier.startsWith(`${candidate}/`)
    const matches = Array.make(matchesModule, matchesSubpath)

    return Array.some(matches, Boolean)
  }

  const effectVitestModule = Array.some(effectVitestModules, candidateMatchesModule)
  const testMember = pipe(Array.head(path), Option.contains("it"))
  const checks = Array.make(effectVitestModule, testMember)

  return Array.every(checks, Boolean)
}

export const importedCallMember = (checker: ts.TypeChecker) =>
  flow(
    Struct.get<ts.CallExpression, "expression">("expression"),
    unwrapCallee,
    importedMemberAt(checker)
  )

export const isEffectVitestTestCall = (checker: ts.TypeChecker) =>
  flow(
    callExpressionOf,
    Option.flatMap(importedCallMember(checker)),
    Option.exists(effectVitestMember)
  )

export const isInsideEffectVitestTest = flow(isEffectVitestTestCall, hasAncestor)
