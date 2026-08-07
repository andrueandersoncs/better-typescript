import { Array, pipe } from "effect"
import * as path from "node:path"
import * as ts from "typescript"

// Benchmarks are test-like because derivation must distinguish them from production callers.
export const isTestPath = (relativePath: string) => {
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

export const isTestSourceFile = (root: string) => {
  const relativeToRoot = (fileName: string) => path.relative(root, fileName)

  const sourceFileIsTest = (sourceFile: ts.SourceFile) =>
    pipe(sourceFile.fileName, relativeToRoot, isTestPath)

  return sourceFileIsTest
}
