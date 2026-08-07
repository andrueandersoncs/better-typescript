import { Array, Option, pipe } from "effect"

import { strictEqual } from "@better-typescript/matchers/equivalence"

import type { ImportedMember } from "../functionalCoreEffect/importedMember.js"

export const isHttpClientMember = (member: ImportedMember) => {
  const direct = strictEqual("effect/unstable/http/HttpClient")(member.moduleSpecifier)
  const isHttpBarrel = strictEqual("effect/unstable/http")(member.moduleSpecifier)
  const pathHead = Array.head(member.path)
  const pathHeadIsHttpClient = pipe(pathHead, Option.contains("HttpClient"))
  const httpBarrelParts = Array.make(isHttpBarrel, pathHeadIsHttpClient)
  const httpBarrel = Array.every(httpBarrelParts, Boolean)
  const path0 = Array.get(member.path, 0)
  const path1 = Array.get(member.path, 1)
  const path2 = Array.get(member.path, 2)
  const unstablePath0 = pipe(path0, Option.contains("http"))
  const unstablePath1 = pipe(path1, Option.contains("HttpClient"))
  const unstableModule = strictEqual("effect/unstable")(member.moduleSpecifier)
  const unstableParts = Array.make(unstableModule, unstablePath0, unstablePath1)
  const unstableBarrel = Array.every(unstableParts, Boolean)
  const effectPath0 = pipe(path0, Option.contains("unstable"))
  const effectPath1 = pipe(path1, Option.contains("http"))
  const effectPath2 = pipe(path2, Option.contains("HttpClient"))
  const effectModule = strictEqual("effect")(member.moduleSpecifier)
  const effectParts = Array.make(effectModule, effectPath0, effectPath1, effectPath2)
  const effectBarrel = Array.every(effectParts, Boolean)
  const sources = Array.make(direct, httpBarrel, unstableBarrel, effectBarrel)

  return Array.some(sources, Boolean)
}
