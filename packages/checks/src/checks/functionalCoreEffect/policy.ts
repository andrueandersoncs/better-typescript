import { Array, Data, Function, HashSet, Option, Order, Struct, Tuple, pipe } from "effect"
import type { ArchitectureRole } from "./data.js"

export type ArchitectureRoleClassifier = (
  projectRelativePath: string
) => Option.Option<ArchitectureRole>

/**
 * ArchitectureRolePath is the shared path-to-role binding used by policy
 * helpers.
 *
 * @remarks
 *   It remains explicit because classifiers and prefix tables must exchange one
 *   path/role pair. Removing it would use parallel arrays whose entries could
 *   drift.
 * @modelRole shared
 */
export class ArchitectureRolePath extends Data.Class<{
  readonly path: string
  readonly role: ArchitectureRole
}> {}

/**
 * FunctionalCoreEffectPolicy is the boundary configuration consumed by
 * functional-core checks.
 *
 * @remarks
 *   It remains explicit because wiring factories and detectors must share one
 *   policy record. Removing it would thread parallel knobs through every check
 *   constructor and let defaults diverge.
 * @modelRole boundary
 */
export class FunctionalCoreEffectPolicy extends Data.Class<{
  readonly roleOf: ArchitectureRoleClassifier
  readonly capabilityModulePrefixes: ReadonlyArray<string>
  readonly resourceFactoryNames: ReadonlyArray<string>
  readonly resourceTypeSuffixes: ReadonlyArray<string>
}> {}

const normalizePath = (value: string): string => {
  const withForwardSlashes = value.replaceAll("\\", "/")

  const withoutLeadingDotSlash = withForwardSlashes.startsWith("./")
    ? withForwardSlashes.slice(2)
    : withForwardSlashes

  const withoutTrailingSlash = withoutLeadingDotSlash.endsWith("/")
    ? withoutLeadingDotSlash.slice(0, -1)
    : withoutLeadingDotSlash

  return withoutTrailingSlash
}

const testDirectoryNames = HashSet.make("test", "tests", "__tests__")

const rootDirectoryNames = HashSet.make(
  "entrypoint",
  "entrypoints",
  "composition",
  "composition-root"
)

const adapterDirectoryNames = HashSet.make("adapter", "adapters", "infrastructure", "infra")

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

const testSuffixes = Array.make(".test.ts", ".test.tsx", ".spec.ts", ".spec.tsx")

const containsSegment =
  (segments: ReadonlyArray<string>) =>
  (names: HashSet.HashSet<string>): boolean =>
    Array.some(segments, (segment) => HashSet.has(names, segment))

const hasTestSuffix = (fileName: string): boolean =>
  Array.some(testSuffixes, (suffix) => fileName.endsWith(suffix))

export const conventionalArchitectureRoleOf: ArchitectureRoleClassifier = (projectRelativePath) => {
  const normalized = normalizePath(projectRelativePath)
  const segments = normalized.split("/")
  const fileName = pipe(Array.last(segments), Option.getOrElse(Function.constant(normalized)))
  const contains = containsSegment(segments)
  const inTestDirectory = contains(testDirectoryNames)
  const hasTestName = hasTestSuffix(fileName)
  const isTestPath = inTestDirectory || hasTestName
  const inRootDirectory = contains(rootDirectoryNames)
  const isRootFile = HashSet.has(rootFileNames, fileName)
  const isRootPath = inRootDirectory || isRootFile
  const isAdapterPath = contains(adapterDirectoryNames)
  const isPortPath = contains(portDirectoryNames)
  const isApplicationPath = contains(applicationDirectoryNames)
  const isDomainPath = contains(domainDirectoryNames)
  const testRule = Tuple.make(isTestPath, "test" as const)
  const rootRule = Tuple.make(isRootPath, "root" as const)
  const adapterRule = Tuple.make(isAdapterPath, "adapter" as const)
  const portRule = Tuple.make(isPortPath, "port" as const)
  const applicationRule = Tuple.make(isApplicationPath, "application" as const)
  const domainRule = Tuple.make(isDomainPath, "domain" as const)

  const roleRules = Array.make(
    testRule,
    rootRule,
    adapterRule,
    portRule,
    applicationRule,
    domainRule
  )

  return pipe(
    roleRules,
    Array.findFirst(([matches]) => matches),
    Option.map(([, role]) => role)
  )
}

const pathLengthOrder: Order.Order<ArchitectureRolePath> = Order.mapInput(
  Order.reverse(Order.number),
  (entry) => normalizePath(entry.path).length
)

const normalizedRolePath = (entry: ArchitectureRolePath): ArchitectureRolePath => {
  const path = normalizePath(entry.path)

  return new ArchitectureRolePath({
    path,
    role: entry.role
  })
}

const pathContains = (prefix: string, candidate: string): boolean => {
  const exact = candidate === prefix
  const nested = candidate.startsWith(`${prefix}/`)

  return exact || nested
}

export const roleByPrefixes = (
  rolePaths: ReadonlyArray<ArchitectureRolePath>
): ArchitectureRoleClassifier => {
  const ordered = pipe(rolePaths, Array.map(normalizedRolePath), Array.sort(pathLengthOrder))

  const roleForPath = (projectRelativePath: string): Option.Option<ArchitectureRole> => {
    const normalized = normalizePath(projectRelativePath)

    return pipe(
      ordered,
      Array.findFirst((entry) => pathContains(entry.path, normalized)),
      Option.map(Struct.get("role"))
    )
  }

  return roleForPath
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

export const defaultFunctionalCoreEffectPolicy = new FunctionalCoreEffectPolicy({
  roleOf: conventionalArchitectureRoleOf,
  capabilityModulePrefixes: defaultCapabilityModulePrefixes,
  resourceFactoryNames: defaultResourceFactoryNames,
  resourceTypeSuffixes: defaultResourceTypeSuffixes
})

export const policyWithRolePrefixes = (
  rolePaths: ReadonlyArray<ArchitectureRolePath>
): FunctionalCoreEffectPolicy =>
  new FunctionalCoreEffectPolicy({
    ...defaultFunctionalCoreEffectPolicy,
    roleOf: roleByPrefixes(rolePaths)
  })
