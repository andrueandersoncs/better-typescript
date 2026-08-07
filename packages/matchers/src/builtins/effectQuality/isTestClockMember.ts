import { Array, Option, pipe } from "effect"

import { strictEqual } from "@better-typescript/matchers/equivalence"

import type { ImportedMember } from "../functionalCoreEffect/importedMember.js"

export const isTestClockMember = (member: ImportedMember) => {
  const fromDirect = strictEqual("effect/testing/TestClock")(member.moduleSpecifier)
  const fromTestingModule = strictEqual("effect/testing")(member.moduleSpecifier)
  const path0 = Array.get(member.path, 0)
  const path1 = Array.get(member.path, 1)
  const fromTestingPath = pipe(path0, Option.contains("TestClock"))
  const fromTestingParts = Array.make(fromTestingModule, fromTestingPath)
  const fromTestingNamespace = Array.every(fromTestingParts, Boolean)
  const fromBarrelPath0 = pipe(path0, Option.contains("testing"))
  const fromBarrelPath1 = pipe(path1, Option.contains("TestClock"))
  const fromBarrelModule = strictEqual("effect")(member.moduleSpecifier)
  const fromBarrelParts = Array.make(fromBarrelModule, fromBarrelPath0, fromBarrelPath1)
  const fromBarrel = Array.every(fromBarrelParts, Boolean)
  const sources = Array.make(fromDirect, fromTestingNamespace, fromBarrel)

  return Array.some(sources, Boolean)
}
