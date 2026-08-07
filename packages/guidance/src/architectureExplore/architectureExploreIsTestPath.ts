import { Array } from "effect"

export const architectureExploreIsTestPath = (relativePath: string) => {
  const normalized = relativePath.replaceAll("\\", "/")
  const testLikeDirectories = Array.make("bench/", "test/", "tests/", "__tests__/")
  const testSuffixes = Array.make(".test.ts", ".test.tsx", ".spec.ts", ".spec.tsx")

  const matchesTestLikeDirectory = (directory: string) =>
    normalized.startsWith(directory) || normalized.includes(`/${directory}`)

  const inTestLikeDirectory = Array.some(testLikeDirectories, matchesTestLikeDirectory)
  const endsWithTestSuffix = (suffix: string) => normalized.endsWith(suffix)
  const hasTestSuffix = Array.some(testSuffixes, endsWithTestSuffix)

  return inTestLikeDirectory || hasTestSuffix
}
