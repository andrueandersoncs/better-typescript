import { Array, Data } from "effect"
import {
  ArchitectureRolePath,
  conventionalArchitectureRoleOf,
  roleByPrefixes,
  type ArchitectureRoleClassifier
} from "../support/architectureRole.js"

export type { ArchitectureRoleClassifier }
export { ArchitectureRolePath, conventionalArchitectureRoleOf, roleByPrefixes }

// FunctionalCoreEffectPolicy is shared check config because wiring and detectors need one record.
export class FunctionalCoreEffectPolicy extends Data.Class<{
  readonly roleOf: ArchitectureRoleClassifier
  readonly capabilityModulePrefixes: ReadonlyArray<string>
  readonly resourceFactoryNames: ReadonlyArray<string>
  readonly resourceTypeSuffixes: ReadonlyArray<string>
}> {}

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

export const policyWithRolePrefixes = (rolePaths: ReadonlyArray<ArchitectureRolePath>) =>
  new FunctionalCoreEffectPolicy({
    ...defaultFunctionalCoreEffectPolicy,
    roleOf: roleByPrefixes(rolePaths)
  })
