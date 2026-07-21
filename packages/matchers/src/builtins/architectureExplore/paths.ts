import * as fs from "node:fs"
import * as path from "node:path"
import { Array, pipe } from "effect"
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

// Workspace paths normalize evidence because cross-package joins compare one path vocabulary.
export const toWorkspacePath =
  (projectRoot: string, workspaceRoot: string) => (projectRelativePath: string) => {
    const projectPath = path.resolve(projectRoot, projectRelativePath)
    const workspacePath = path.relative(workspaceRoot, projectPath)

    return workspacePath.replaceAll(path.sep, "/")
  }

export const isTestSourceFile = (root: string) => {
  const relativeToRoot = (fileName: string) => path.relative(root, fileName)

  const sourceFileIsTest = (sourceFile: ts.SourceFile) =>
    pipe(sourceFile.fileName, relativeToRoot, isTestPath)

  return sourceFileIsTest
}

// Skip package library surfaces because test-only use does not prove an internal test seam.
export const isPackageProject =
  (workspaceRoot: string) =>
  (projectRoot: string): boolean => {
    const workspacePath = path.relative(workspaceRoot, projectRoot).replaceAll(path.sep, "/")
    const isPackagesPath = workspacePath.startsWith("packages/")
    const workspaceConfigPath = path.join(workspaceRoot, "better-typescript.config.ts")
    const projectPackagePath = path.join(projectRoot, "package.json")
    const hasWorkspaceConfig = fs.existsSync(workspaceConfigPath)
    const hasProjectPackage = fs.existsSync(projectPackagePath)
    const hasPackageMarkers = hasWorkspaceConfig && hasProjectPackage

    return isPackagesPath && hasPackageMarkers
  }
