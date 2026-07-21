import { Array, Option, pipe } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import type { ImportedMember } from "./importedMembers.js"

const effectBarrelPlatformCapabilityNames: Readonly<Record<string, true>> = {
  FileSystem: true,
  Terminal: true,
  Path: true
}

const unstableHttpNamespaces = Array.make("http", "httpapi")

const nameIsUnstableHttpNamespace = (name: string) => Array.contains(unstableHttpNamespaces, name)

const isMovedPlatformCapabilityName = (name: string) =>
  strictEqual(true)(effectBarrelPlatformCapabilityNames[name])

export const importedMemberIsMovedPlatformCapability = (member: ImportedMember) => {
  const fromEffectBarrel = strictEqual("effect")(member.moduleSpecifier)
  const pathHead = Array.get(member.path, 0)
  const pathSecond = Array.get(member.path, 1)
  const isMovedBarrelMember = pipe(pathHead, Option.exists(isMovedPlatformCapabilityName))
  const barrelChecks = Array.make(fromEffectBarrel, isMovedBarrelMember)
  const fromBarrel = Array.every(barrelChecks, Boolean)
  const isUnstableNamespace = pipe(pathHead, Option.contains("unstable"))
  const isHttpNamespace = pipe(pathSecond, Option.exists(nameIsUnstableHttpNamespace))
  const unstableChecks = Array.make(fromEffectBarrel, isUnstableNamespace, isHttpNamespace)
  const fromUnstableHttp = Array.every(unstableChecks, Boolean)
  const capabilitySources = Array.make(fromBarrel, fromUnstableHttp)

  return Array.some(capabilitySources, Boolean)
}
