import { Array, Option, pipe } from "effect"

import { strictEqual } from "@better-typescript/matchers/equivalence"

import type { ImportedMember } from "../functionalCoreEffect/importedMember.js"

import { segmentIsHttpNamespace } from "./httpNamespaceNames.js"

import { memberLastName } from "./memberLastName.js"

const moduleIsEffectHttp = (moduleSpecifier: string) => {
  const exactUnstable = strictEqual("effect/unstable/http")(moduleSpecifier)
  const nestedUnstable = moduleSpecifier.startsWith("effect/unstable/http/")
  const platformExact = strictEqual("@effect/platform")(moduleSpecifier)
  const platformNested = moduleSpecifier.startsWith("@effect/platform/")
  const effectHttpNested = moduleSpecifier.startsWith("effect/Http")

  const flags = Array.make(
    exactUnstable,
    nestedUnstable,
    platformExact,
    platformNested,
    effectHttpNested
  )

  return Array.some(flags, Boolean)
}

const pathMatchesHttpNamespaceApi = (path: ReadonlyArray<string>) => {
  const hasNamespace = Array.some(path, segmentIsHttpNamespace)
  const singleMemberPath = strictEqual(1)(path.length)
  const pathFlags = Array.make(hasNamespace, singleMemberPath)

  return Array.some(pathFlags, Boolean)
}

const barrelPathMatchesHttpNamespace = (path: ReadonlyArray<string>) => {
  const path0 = Array.get(path, 0)
  const path1 = Array.get(path, 1)
  const path2 = Array.get(path, 2)
  const barrelNamespace = pipe(path0, Option.exists(segmentIsHttpNamespace))
  const unstableNamespace = pipe(path2, Option.exists(segmentIsHttpNamespace))
  const hasUnstable = pipe(path0, Option.contains("unstable"))
  const hasHttp = pipe(path1, Option.contains("http"))
  const unstablePathFlags = Array.make(hasUnstable, hasHttp, unstableNamespace)
  const unstablePath = Array.every(unstablePathFlags, Boolean)
  const barrelFlags = Array.make(barrelNamespace, unstablePath)

  return Array.some(barrelFlags, Boolean)
}

export const memberIsHttpNamespaceApi =
  (names: ReadonlyArray<string>) => (member: ImportedMember) => {
    const last = memberLastName(member)
    const nameMatches = Array.contains(names, last)
    const fromHttpModule = moduleIsEffectHttp(member.moduleSpecifier)
    const fromEffectBarrel = strictEqual("effect")(member.moduleSpecifier)
    const moduleOkFlags = Array.make(fromHttpModule, fromEffectBarrel)
    const moduleOk = Array.some(moduleOkFlags, Boolean)
    const nonEffectBarrel = member.moduleSpecifier !== "effect"
    const nonEffectHttpFlags = Array.make(fromHttpModule, nonEffectBarrel)
    const nonEffectHttpModule = Array.every(nonEffectHttpFlags, Boolean)

    const pathMatches = nonEffectHttpModule
      ? pathMatchesHttpNamespaceApi(member.path)
      : barrelPathMatchesHttpNamespace(member.path)

    const flags = Array.make(nameMatches, moduleOk, pathMatches)

    return Array.every(flags, Boolean)
  }
