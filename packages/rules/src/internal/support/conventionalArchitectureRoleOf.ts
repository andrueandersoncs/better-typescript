import { Array, Function, HashSet, Option, pipe, Tuple } from "effect"
import type { ArchitectureRoleClassifier } from "./architectureRoleClassifier.js"
import type { ArchitectureRole } from "./architectureRoleType.js"
import { normalizePath } from "./normalizePath.js"

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

const containsSegment = (segments: ReadonlyArray<string>) => (names: HashSet.HashSet<string>) => {
  const hasName = (segment: string) => HashSet.has(names, segment)

  return Array.some(segments, hasName)
}

const hasTestSuffix = (fileName: string) => {
  const matchesSuffix = (suffix: string) => fileName.endsWith(suffix)

  return Array.some(testSuffixes, matchesSuffix)
}

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

  const roleRuleMatches = ([matches]: readonly [boolean, ArchitectureRole]) => matches
  const roleRuleRole = ([, role]: readonly [boolean, ArchitectureRole]) => role

  return pipe(roleRules, Array.findFirst(roleRuleMatches), Option.map(roleRuleRole))
}
