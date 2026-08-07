import { Array, Option, Order, pipe, Struct } from "effect"
import { strictEqual } from "../../equivalence.js"
import type { ArchitectureRoleClassifier } from "../../support/architectureRoleClassifier.js"
import { ArchitectureRolePath } from "../../support/architectureRolePath.js"
import { conventionalArchitectureRoleOf } from "../../support/conventionalArchitectureRoleOf.js"
import { normalizePath } from "../../support/normalizePath.js"
import { FunctionalCoreEffectPolicy } from "./functionalCoreEffectPolicyClass.js"

const defaultCapabilityModulePrefixes = Array.make(
  "node:",
  "fs",
  "http",
  "https",
  "net",
  "tls",
  "dgram",
  "child_process",
  "worker_threads",
  "process",
  "effect/FileSystem",
  "effect/Terminal",
  "effect/Path",
  "effect/unstable/http",
  "effect/unstable/httpapi"
)

const defaultResourceFactoryNames = Array.make(
  "connect",
  "createClient",
  "createConnection",
  "createPool",
  "open"
)

const defaultResourceTypeSuffixes = Array.make(
  "Client",
  "Connection",
  "Pool",
  "Driver",
  "Transport",
  "Database"
)

export const defaultFunctionalCoreEffectPolicy = new FunctionalCoreEffectPolicy({
  roleOf: conventionalArchitectureRoleOf,
  capabilityModulePrefixes: defaultCapabilityModulePrefixes,
  resourceFactoryNames: defaultResourceFactoryNames,
  resourceTypeSuffixes: defaultResourceTypeSuffixes
})

const architectureRolePathLength = (entry: ArchitectureRolePath) => normalizePath(entry.path).length

const pathLengthOrder = Order.mapInput(Order.flip(Order.Number), architectureRolePathLength)

const makeNormalizedRolePath = (entry: ArchitectureRolePath) => {
  const path = normalizePath(entry.path)

  return new ArchitectureRolePath({
    path,
    role: entry.role
  })
}

const pathContains = (prefix: string, candidate: string) => {
  const exact = strictEqual(prefix)(candidate)
  const nested = candidate.startsWith(`${prefix}/`)

  return exact || nested
}

export const roleByPrefixes = (
  rolePaths: ReadonlyArray<ArchitectureRolePath>
): ArchitectureRoleClassifier => {
  const ordered = pipe(rolePaths, Array.map(makeNormalizedRolePath), Array.sort(pathLengthOrder))

  const roleForPath = (projectRelativePath: string) => {
    const normalized = normalizePath(projectRelativePath)

    const containsNormalizedPath = (entry: ArchitectureRolePath) =>
      pathContains(entry.path, normalized)

    return pipe(ordered, Array.findFirst(containsNormalizedPath), Option.map(Struct.get("role")))
  }

  return roleForPath
}

export const policyWithRolePrefixes = (rolePaths: ReadonlyArray<ArchitectureRolePath>) =>
  new FunctionalCoreEffectPolicy({
    ...defaultFunctionalCoreEffectPolicy,
    roleOf: roleByPrefixes(rolePaths)
  })
