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
import { strictEqual } from "@better-typescript/core/engine/equivalence"
import * as ts from "typescript"
import { withProgramIndex } from "../../defineCheck.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"

import type { Detection } from "@better-typescript/core/engine/location/data"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"
import { isProjectSourceFile } from "@better-typescript/core/engine/sources"
import { toRelativeFileName } from "@better-typescript/core/engine/location"
import { fileSubscriptions, makeDetection } from "@better-typescript/core/engine/check"

import { ModuleIdentityData } from "./data.js"
import { toWorkspacePath } from "./programSymbols.js"
import { makeSilentCheck } from "../../defineCheck.js"
import { moduleIdentityName } from "./names.js"

const message =
  "Module identity evidence — this source file publishes one or more package export aliases."

const hint =
  "Aliases come from package.json exports matched to the file's emitted path; missing outDir yields no identity evidence."

const aliasListSchema = Schema.Array(Schema.String)
const aliasesByFileSchema = Schema.HashMap(Schema.String, aliasListSchema)
const unknownRecordSchema = Schema.Record(Schema.String, Schema.Unknown)

const PackageExports = Schema.Struct({
  name: Schema.NonEmptyString,
  exports: Schema.Unknown
})

// Decoded package identity because alias matching must reject malformed manifests.
interface PackageExports extends Schema.Schema.Type<typeof PackageExports> {}

const AliasIndex = Schema.Struct({
  aliasesByFile: aliasesByFileSchema
})

// AliasIndex is the program-wide alias lookup because subscriptions share one immutable contract.
interface AliasIndex extends Schema.Schema.Type<typeof AliasIndex> {}

const packageExportsJson = Schema.fromJsonString(PackageExports)
const decodePackageExports = Schema.decodeUnknownOption(packageExportsJson)
const decodeUnknownRecord = Schema.decodeUnknownOption(unknownRecordSchema)

const readPackageExports = (projectRoot: string) => {
  const packagePath = path.join(projectRoot, "package.json")
  const contents = ts.sys.readFile(packagePath)

  return pipe(contents, Option.fromNullishOr, Option.flatMap(decodePackageExports))
}

const preferredExportConditions = Array.make("import", "default")

const firstStringFromRecord = (record: Record.ReadonlyRecord<string, unknown>) => {
  const preferredValueFor = (key: string) =>
    pipe(
      Record.get(record, key),
      Option.filter(Predicate.isString),
      Result.fromOption(Function.constVoid)
    )

  const preferredValues = Array.filterMap(preferredExportConditions, preferredValueFor)
  const preferred = Array.head(preferredValues)
  const values = Record.values(record)
  const fallback = Array.findFirst(values, Predicate.isString)

  return Option.orElse(preferred, Function.constant(fallback))
}

const firstStringFromUnknownRecord = Function.flow(
  decodeUnknownRecord,
  Option.flatMap(firstStringFromRecord)
)

const firstStringValue = (value: unknown) =>
  pipe(
    Match.value(value),
    Match.when(Predicate.isString, Option.some<string>),
    Match.orElse(firstStringFromUnknownRecord)
  )

const exportEntriesFromRecord = (
  record: Record.ReadonlyRecord<string, unknown>
): ReadonlyArray<readonly [string, string]> => {
  const entries = Record.toEntries(record)

  const entryFromPair = ([subpath, value]: readonly [string, unknown]) => {
    const pairWithSubpath = (target: string) => Tuple.make(subpath, target)

    return pipe(
      firstStringValue(value),
      Option.map(pairWithSubpath),
      Result.fromOption(Function.constVoid)
    )
  }

  return Array.filterMap(entries, entryFromPair)
}

const rootPairFor = (target: string) => Tuple.make(".", target)
const rootExportEntry = Function.flow(rootPairFor, Array.of)

const exportEntriesFromUnknown = Function.flow(
  decodeUnknownRecord,
  Option.map(exportEntriesFromRecord),
  Option.getOrElse(Array.empty)
)

const exportEntries = (exportsField: unknown): ReadonlyArray<readonly [string, string]> =>
  pipe(
    Match.value(exportsField),
    Match.when(Predicate.isString, rootExportEntry),
    Match.orElse(exportEntriesFromUnknown)
  )

const toEmittedPath = (rootDir: string, outDir: string) => (fileName: string) => {
  const relative = path.relative(rootDir, fileName)
  const javascriptName = relative.replace(/\.tsx?$/u, ".js")

  return path.join(outDir, javascriptName)
}

const aliasFromSubpath = (packageName: string, subpath: string) =>
  strictEqual(subpath, ".") ? packageName : `${packageName}${subpath.slice(1)}`

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
      const hasSingleSubpathStar = strictEqual(subpathStars, 1)
      const hasSingleTargetStar = strictEqual(targetStars, 1)
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
          const matchesTarget = strictEqual(resolvedTarget, emittedPath)

          return matchesTarget ? Result.succeed(alias) : Result.failVoid
        })
      )
    })

const buildAliasIndex = (context: ProgramContext) => {
  const options = context.program.getCompilerOptions()
  const rootDir = options.rootDir ?? context.projectRoot
  const outDirOption = Option.fromNullishOr(options.outDir)
  const packageInfo = readPackageExports(context.projectRoot)
  const emptyAliasesByFile = HashMap.empty<string, ReadonlyArray<string>>()

  const prerequisites = Option.all({
    outDir: outDirOption,
    packageInfo
  })

  const aliasesByFile = pipe(
    prerequisites,
    Option.match({
      onNone: Function.constant(emptyAliasesByFile),
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

        return Array.reduce(projectFiles, emptyAliasesByFile, addFileAliases)
      }
    })
  )

  return AliasIndex.make({ aliasesByFile })
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
          const element = makeDetection(context)
          const firstStatement = Option.fromNullishOr(context.sourceFile.statements[0])
          const fallbackNode = Function.constant(context.sourceFile)
          const node = pipe(firstStatement, Option.getOrElse(fallbackNode))

          const data = ModuleIdentityData.make({
            workspacePath,
            aliases
          })

          const identityElement = element({ node, message, hint, data })

          return Array.of(identityElement)
        }
      })
    )

const moduleIdentitySubscriptions = Function.compose(moduleIdentityElements, fileSubscriptions)

const moduleIdentityCheck = withProgramIndex(buildAliasIndex)(moduleIdentitySubscriptions)

export const moduleIdentity = makeSilentCheck(moduleIdentityName, moduleIdentityCheck)
