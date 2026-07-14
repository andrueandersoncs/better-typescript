import {
  Array,
  Data,
  Function,
  HashSet,
  Option,
  Order,
  Struct,
  pipe
} from "effect"
import type { ArchitectureRole } from "./data.js"

export type ArchitectureRoleClassifier = (
  projectRelativePath: string
) => Option.Option<ArchitectureRole>

export class ArchitectureRolePath extends Data.Class<{
  readonly path: string
  readonly role: ArchitectureRole
}> {}

export class FunctionalCoreEffectPolicy extends Data.Class<{
  readonly roleOf: ArchitectureRoleClassifier
  readonly capabilityModulePrefixes: ReadonlyArray<string>
  readonly resourceFactoryNames: ReadonlyArray<string>
  readonly resourceTypeSuffixes: ReadonlyArray<string>
}> {}

const normalizePath = (value: string): string =>
  value.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "")

const testDirectoryNames = HashSet.make("test", "tests", "__tests__")

const rootDirectoryNames = HashSet.make(
  "entrypoint",
  "entrypoints",
  "composition",
  "composition-root"
)

const adapterDirectoryNames = HashSet.make(
  "adapter",
  "adapters",
  "infrastructure",
  "infra"
)

const portDirectoryNames = HashSet.make("port", "ports")

const applicationDirectoryNames = HashSet.make(
  "application",
  "use-case",
  "use-cases",
  "usecase",
  "usecases"
)

const domainDirectoryNames = HashSet.make("domain")

const rootFileNames = HashSet.make(
  "main.ts",
  "main.tsx",
  "bootstrap.ts",
  "bootstrap.tsx",
  "wiring.ts",
  "wiring.tsx"
)

const testSuffixes = Array.make(
  ".test.ts",
  ".test.tsx",
  ".spec.ts",
  ".spec.tsx"
)

const containsSegment =
  (segments: ReadonlyArray<string>) =>
  (names: HashSet.HashSet<string>): boolean =>
    Array.some(segments, (segment) => HashSet.has(names, segment))

const hasTestSuffix = (fileName: string): boolean =>
  Array.some(testSuffixes, (suffix) => fileName.endsWith(suffix))

export const conventionalArchitectureRoleOf: ArchitectureRoleClassifier = (
  projectRelativePath
) => {
  const normalized = normalizePath(projectRelativePath)
  const segments = normalized.split("/")
  const fileName = pipe(
    Array.last(segments),
    Option.getOrElse(Function.constant(normalized))
  )
  const contains = containsSegment(segments)

  if (contains(testDirectoryNames) || hasTestSuffix(fileName)) {
    return Option.some("test")
  }

  if (contains(rootDirectoryNames) || HashSet.has(rootFileNames, fileName)) {
    return Option.some("root")
  }

  if (contains(adapterDirectoryNames)) {
    return Option.some("adapter")
  }

  if (contains(portDirectoryNames)) {
    return Option.some("port")
  }

  if (contains(applicationDirectoryNames)) {
    return Option.some("application")
  }

  if (contains(domainDirectoryNames)) {
    return Option.some("domain")
  }

  return Option.none()
}

const pathLengthOrder: Order.Order<ArchitectureRolePath> = Order.mapInput(
  Order.reverse(Order.number),
  (entry) => normalizePath(entry.path).length
)

const normalizedRolePath = (
  entry: ArchitectureRolePath
): ArchitectureRolePath =>
  new ArchitectureRolePath({
    path: normalizePath(entry.path),
    role: entry.role
  })

const pathContains = (prefix: string, candidate: string): boolean =>
  candidate === prefix || candidate.startsWith(`${prefix}/`)

export const roleByPrefixes = (
  rolePaths: ReadonlyArray<ArchitectureRolePath>
): ArchitectureRoleClassifier => {
  const ordered = pipe(
    rolePaths,
    Array.map(normalizedRolePath),
    Array.sort(pathLengthOrder)
  )

  return (projectRelativePath) => {
    const normalized = normalizePath(projectRelativePath)

    return pipe(
      ordered,
      Array.findFirst((entry) => pathContains(entry.path, normalized)),
      Option.map(Struct.get("role"))
    )
  }
}

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
  "@effect/platform"
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

export const defaultFunctionalCoreEffectPolicy = new FunctionalCoreEffectPolicy(
  {
    roleOf: conventionalArchitectureRoleOf,
    capabilityModulePrefixes: defaultCapabilityModulePrefixes,
    resourceFactoryNames: defaultResourceFactoryNames,
    resourceTypeSuffixes: defaultResourceTypeSuffixes
  }
)

export const policyWithRolePrefixes = (
  rolePaths: ReadonlyArray<ArchitectureRolePath>
): FunctionalCoreEffectPolicy =>
  new FunctionalCoreEffectPolicy({
    ...defaultFunctionalCoreEffectPolicy,
    roleOf: roleByPrefixes(rolePaths)
  })
