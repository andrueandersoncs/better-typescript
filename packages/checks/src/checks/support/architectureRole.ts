import { Array, Data, Function, HashSet, Option, Order, Struct, Tuple, pipe } from "effect"

// Shared role vocabulary because boundary and quality checks need the same literals.
export type ArchitectureRole = "domain" | "port" | "application" | "adapter" | "root" | "test"

export const architectureRoles = Array.make<
  ["domain", "port", "application", "adapter", "root", "test"]
>("domain", "port", "application", "adapter", "root", "test")

export type ArchitectureRoleClassifier = (
  projectRelativePath: string
) => Option.Option<ArchitectureRole>

// ArchitectureRolePath is shared path-to-role pair because classifiers exchange one binding.
export class ArchitectureRolePath extends Data.Class<{
  readonly path: string
  readonly role: ArchitectureRole
}> {}

const normalizePath = (value: string) => {
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

const containsSegment = (segments: ReadonlyArray<string>) => (names: HashSet.HashSet<string>) =>
  Array.some(segments, (segment) => HashSet.has(names, segment))

const hasTestSuffix = (fileName: string) =>
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
  Order.flip(Order.Number),
  (entry) => normalizePath(entry.path).length
)

const makeNormalizedRolePath = (entry: ArchitectureRolePath) => {
  const path = normalizePath(entry.path)

  return new ArchitectureRolePath({
    path,
    role: entry.role
  })
}

const pathContains = (prefix: string, candidate: string) => {
  const exact = candidate === prefix
  const nested = candidate.startsWith(`${prefix}/`)

  return exact || nested
}

export const roleByPrefixes = (
  rolePaths: ReadonlyArray<ArchitectureRolePath>
): ArchitectureRoleClassifier => {
  const ordered = pipe(rolePaths, Array.map(makeNormalizedRolePath), Array.sort(pathLengthOrder))

  const roleForPath = (projectRelativePath: string) => {
    const normalized = normalizePath(projectRelativePath)

    return pipe(
      ordered,
      Array.findFirst((entry) => pathContains(entry.path, normalized)),
      Option.map(Struct.get("role"))
    )
  }

  return roleForPath
}
