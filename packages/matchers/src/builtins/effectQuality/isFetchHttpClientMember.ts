import { Array, Option, pipe } from "effect"

import { strictEqual } from "@better-typescript/matchers/equivalence"

import type { ImportedMember } from "../functionalCoreEffect/importedMember.js"

export const isFetchHttpClientMember = (member: ImportedMember) => {
  const direct = strictEqual("effect/unstable/http/FetchHttpClient")(member.moduleSpecifier)
  const isHttpBarrel = strictEqual("effect/unstable/http")(member.moduleSpecifier)
  const pathHead = Array.head(member.path)
  const pathHeadIsFetchHttpClient = pipe(pathHead, Option.contains("FetchHttpClient"))
  const httpBarrelParts = Array.make(isHttpBarrel, pathHeadIsFetchHttpClient)
  const httpBarrel = Array.every(httpBarrelParts, Boolean)
  const path0 = Array.get(member.path, 0)
  const path1 = Array.get(member.path, 1)
  const path2 = Array.get(member.path, 2)
  const effectPath0 = pipe(path0, Option.contains("unstable"))
  const effectPath1 = pipe(path1, Option.contains("http"))
  const effectPath2 = pipe(path2, Option.contains("FetchHttpClient"))
  const effectModule = strictEqual("effect")(member.moduleSpecifier)
  const effectParts = Array.make(effectModule, effectPath0, effectPath1, effectPath2)
  const effectBarrel = Array.every(effectParts, Boolean)
  const sources = Array.make(direct, httpBarrel, effectBarrel)

  return Array.some(sources, Boolean)
}
