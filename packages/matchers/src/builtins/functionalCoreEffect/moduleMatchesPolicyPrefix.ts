import { Array } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import type { FunctionalCoreEffectPolicy } from "./functionalCoreEffectPolicyClass.js"

export const moduleMatchesPolicyPrefix = (
  policy: FunctionalCoreEffectPolicy,
  moduleSpecifier: string
) =>
  Array.some(policy.capabilityModulePrefixes, (prefix) => {
    const namespacePrefix = prefix.endsWith(":")
    const namespaceMatch = namespacePrefix && moduleSpecifier.startsWith(prefix)
    const packagePrefix = `${prefix}/`
    const exactPackage = strictEqual(prefix)(moduleSpecifier)
    const nestedPackage = moduleSpecifier.startsWith(packagePrefix)
    const packageMatch = exactPackage || nestedPackage
    const matchFlags = Array.make(namespaceMatch, packageMatch)

    return Array.some(matchFlags, Boolean)
  })
