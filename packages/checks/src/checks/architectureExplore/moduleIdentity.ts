import * as path from "node:path"
import {
  Array,
  Function,
  HashMap,
  Match,
  Option,
  Predicate,
  Record,
  Result,
  Schema,
  Tuple,
  pipe
} from "effect"
import * as ts from "typescript"
import { withProgramIndex } from "../../defineCheck.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"
import { isProjectSourceFile } from "@better-typescript/core/engine/sources"
import { toRelativeFileName } from "@better-typescript/core/engine/location"
import { fileSubscriptions, detection } from "@better-typescript/core/engine/check"

import { ModuleIdentityData } from "./data.js"
import { toWorkspacePath } from "./programSymbols.js"

const message =
  "Module identity evidence — this source file publishes one or more package export aliases."

const hint =
  "Aliases come from package.json exports matched to the file's emitted path; missing outDir yields no identity evidence."

const aliasListSchema = Schema.Array(Schema.String)
const aliasesByFileSchema = Schema.HashMap(Schema.String, aliasListSchema)
const unknownRecordSchema = Schema.Record(Schema.String, Schema.Unknown)

// PackageExports validates identity because malformed manifests must never enter alias matching.
class PackageExports extends Schema.Class<PackageExports>("PackageExports")({
  name: Schema.NonEmptyString,
  exports: Schema.Unknown
}) {}

// AliasIndex owns immutable aliases because subscriptions need one program-wide lookup contract.
class AliasIndex extends Schema.Class<AliasIndex>("AliasIndex")({
  aliasesByFile: aliasesByFileSchema
}) {}

const packageExportsJson = Schema.fromJsonString(PackageExports)
const decodePackageExports = Schema.decodeUnknownOption(packageExportsJson)
const decodeUnknownRecord = Schema.decodeUnknownOption(unknownRecordSchema)

const readPackageExports = (projectRoot: string): Option.Option<PackageExports> => {
  const packagePath = path.join(projectRoot, "package.json")
  const contents = ts.sys.readFile(packagePath)

  return pipe(contents, Option.fromNullishOr, Option.flatMap(decodePackageExports))
}

const preferredExportConditions = Array.make("import", "default")

const firstStringFromRecord = (
  record: Record.ReadonlyRecord<string, unknown>
): Option.Option<string> => {
  const preferredValues = Array.filterMap(preferredExportConditions, (key) =>
    pipe(
      Record.get(record, key),
      Option.filter(Predicate.isString),
      Result.fromOption(Function.constVoid)
    )
  )

  const preferred = Array.head(preferredValues)
  const values = Record.values(record)
  const fallback = Array.findFirst(values, Predicate.isString)

  return Option.orElse(preferred, Function.constant(fallback))
}

const firstStringValue = (value: unknown): Option.Option<string> =>
  pipe(
    Match.value(value),
    Match.when(Predicate.isString, Option.some<string>),
    Match.orElse((candidate) =>
      pipe(decodeUnknownRecord(candidate), Option.flatMap(firstStringFromRecord))
    )
  )

const exportEntriesFromRecord = (
  record: Record.ReadonlyRecord<string, unknown>
): ReadonlyArray<readonly [string, string]> => {
  const entries = Record.toEntries(record)

  return Array.filterMap(entries, ([subpath, value]) =>
    pipe(
      firstStringValue(value),
      Option.map((target) => Tuple.make(subpath, target)),
      Result.fromOption(Function.constVoid)
    )
  )
}

const exportEntries = (exportsField: unknown): ReadonlyArray<readonly [string, string]> =>
  pipe(
    Match.value(exportsField),
    Match.when(Predicate.isString, (target) => pipe(Tuple.make(".", target), Array.of)),
    Match.orElse((candidate) =>
      pipe(
        decodeUnknownRecord(candidate),
        Option.map(exportEntriesFromRecord),
        Option.getOrElse(Array.empty)
      )
    )
  )

const toEmittedPath =
  (rootDir: string, outDir: string) =>
  (fileName: string): string => {
    const relative = path.relative(rootDir, fileName)
    const javascriptName = relative.replace(/\.tsx?$/u, ".js")

    return path.join(outDir, javascriptName)
  }

const aliasFromSubpath = (packageName: string, subpath: string): string =>
  subpath === "." ? packageName : `${packageName}${subpath.slice(1)}`

const matchWildcard = (pattern: string, value: string): Option.Option<string> => {
  const starIndex = pattern.indexOf("*")

  if (starIndex < 0) {
    return Option.none()
  }

  const prefix = pattern.slice(0, starIndex)
  const suffix = pattern.slice(starIndex + 1)
  const hasPrefix = value.startsWith(prefix)
  const hasSuffix = value.endsWith(suffix)
  const captureLength = value.length - prefix.length - suffix.length
  const hasNonNegativeCapture = captureLength >= 0
  const captureConditions = Array.make(hasPrefix, hasSuffix, hasNonNegativeCapture)
  const capturesWildcard = Array.every(captureConditions, Boolean)
  const captureEnd = prefix.length + captureLength
  const capture = value.slice(prefix.length, captureEnd)

  return capturesWildcard ? Option.some(capture) : Option.none()
}

const aliasesForEmittedPath =
  (projectRoot: string, packageName: string, entries: ReadonlyArray<readonly [string, string]>) =>
  (emittedPath: string): ReadonlyArray<string> =>
    Array.filterMap(entries, ([subpath, target]) => {
      const resolvedTarget = path.resolve(projectRoot, target)
      const subpathStars = subpath.split("*").length - 1
      const targetStars = target.split("*").length - 1
      const hasSingleSubpathStar = subpathStars === 1
      const hasSingleTargetStar = targetStars === 1
      const wildcardConditions = Array.make(hasSingleSubpathStar, hasSingleTargetStar)
      const isWildcard = Array.every(wildcardConditions, Boolean)

      return pipe(
        Match.value(isWildcard),
        Match.when(true, () =>
          pipe(
            matchWildcard(resolvedTarget, emittedPath),
            Option.map((capture) => {
              const capturedSubpath = subpath.replace("*", capture)

              return aliasFromSubpath(packageName, capturedSubpath)
            }),
            Result.fromOption(Function.constVoid)
          )
        ),
        Match.orElse(() => {
          const alias = aliasFromSubpath(packageName, subpath)
          const matchesTarget = resolvedTarget === emittedPath

          return matchesTarget ? Result.succeed(alias) : Result.failVoid
        })
      )
    })

const buildAliasIndex = (context: ProgramContext): AliasIndex => {
  const options = context.program.getCompilerOptions()
  const rootDir = options.rootDir ?? context.projectRoot
  const outDirOption = Option.fromNullishOr(options.outDir)
  const packageInfo = readPackageExports(context.projectRoot)
  const emptyAliasesByFile = HashMap.empty<string, ReadonlyArray<string>>()
  const emptyIndex = new AliasIndex({ aliasesByFile: emptyAliasesByFile })

  const prerequisites = Option.all({
    outDir: outDirOption,
    packageInfo
  })

  return pipe(
    prerequisites,
    Option.match({
      onNone: Function.constant(emptyIndex),
      onSome: ({ outDir, packageInfo }) => {
        const entries = exportEntries(packageInfo.exports)
        const emittedPathFor = toEmittedPath(rootDir, outDir)
        const aliasesFor = aliasesForEmittedPath(context.projectRoot, packageInfo.name, entries)
        const sourceFiles = context.program.getSourceFiles()
        const projectFiles = Array.filter(sourceFiles, isProjectSourceFile)

        const addFileAliases = (
          aliasesByFile: HashMap.HashMap<string, ReadonlyArray<string>>,
          sourceFile: ts.SourceFile
        ): HashMap.HashMap<string, ReadonlyArray<string>> => {
          const emittedPath = emittedPathFor(sourceFile.fileName)
          const aliases = aliasesFor(emittedPath)
          const aliasesOption = Option.liftPredicate(Array.isReadonlyArrayNonEmpty)(aliases)

          return pipe(
            aliasesOption,
            Option.map((nonEmptyAliases) => {
              const uniqueAliases = Array.dedupe(nonEmptyAliases)

              return HashMap.set(aliasesByFile, sourceFile.fileName, uniqueAliases)
            }),
            Option.getOrElse(Function.constant(aliasesByFile))
          )
        }

        const aliasesByFile = Array.reduce(projectFiles, emptyAliasesByFile, addFileAliases)

        return new AliasIndex({ aliasesByFile })
      }
    })
  )
}

const moduleIdentityElements =
  (index: AliasIndex) =>
  (context: CheckContext): ReadonlyArray<Detection> =>
    pipe(
      HashMap.get(index.aliasesByFile, context.sourceFile.fileName),
      Option.filter(Array.isReadonlyArrayNonEmpty),
      Option.match({
        onNone: Array.empty,
        onSome: (aliases) => {
          const relative = toRelativeFileName(context.projectRoot)
          const workspaceRelative = toWorkspacePath(context.projectRoot, context.workspaceRoot)
          const relativePath = relative(context.sourceFile.fileName)
          const workspacePath = workspaceRelative(relativePath)
          const element = detection(context)
          const firstStatement = Option.fromNullishOr(context.sourceFile.statements[0])
          const fallbackNode = Function.constant(context.sourceFile)
          const node = pipe(firstStatement, Option.getOrElse(fallbackNode))

          const data = new ModuleIdentityData({
            workspacePath,
            aliases
          })

          const identityElement = element({ node, message, hint, data })

          return Array.of(identityElement)
        }
      })
    )

const moduleIdentitySubscriptions = Function.compose(moduleIdentityElements, fileSubscriptions)

export const moduleIdentity: Check = withProgramIndex(buildAliasIndex)(moduleIdentitySubscriptions)
