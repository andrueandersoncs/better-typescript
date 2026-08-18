import {
  Array,
  Data,
  HashMap,
  MutableRef,
  Option,
  Result,
  Schema,
  Struct,
  flow,
  pipe,
  Match as EffectMatch
} from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import { foldAst } from "../sources/foldAst.js"
import { toRelativeFileName } from "../support/paths.js"
import { nodeOwnsChild } from "../support/nodeOwnsChild.js"
import { isTestSourceFile } from "./architectureExplore/isTestPath.js"
import { toWorkspacePath } from "./architectureExplore/toWorkspacePath.js"
import { fileMatcher } from "../matcher/fileMatcher.js"
import { makeNodeMatch } from "../matcher/makeNodeMatch.js"
import type { Match as MatcherMatch } from "../matcher/match.js"
import type { MatchContext } from "../matcher/matchContext.js"

import { ImportedNameUsage } from "./architectureExplore/importedNameUsage.js"

const importedNameUsageArray = Schema.Array(ImportedNameUsage)

// ImportUsageData records one import declaration because cross-package joins need raw specifiers.
export const ImportUsageData = Schema.Struct({
  specifier: Schema.String,
  importerWorkspacePath: Schema.String,
  fromTest: Schema.Boolean,
  names: importedNameUsageArray
})

export interface ImportUsageData extends Schema.Schema.Type<typeof ImportUsageData> {}

const importUsageElements = (
  context: MatchContext
): ReadonlyArray<MatcherMatch<ImportUsageData>> => {
  // BindingCounter uses explicit mutable cells because one hot AST pass updates every imported name.
  class BindingCounter extends Data.Class<{
    readonly binding: ts.Identifier
    readonly importStart: number
    readonly importEnd: number
    readonly isNamespace: boolean
    readonly referenceCount: MutableRef.MutableRef<number>
    readonly callCount: MutableRef.MutableRef<number>
  }> {}

  // ImportRecord preserves declaration order because emitted evidence must match source order.
  class ImportRecord extends Data.Class<{
    readonly declaration: ts.ImportDeclaration
    readonly specifier: string
    readonly counters: ReadonlyArray<BindingCounter>
  }> {
    // Specifier text is evidence identity because ImportUsageData joins on the raw module path.
    get moduleSpecifier(): string {
      return this.specifier
    }
  }

  const callExpression = Struct.get<ts.CallExpression, "expression">("expression")
  const callExpressionOwnsChild = nodeOwnsChild(ts.isCallExpression, callExpression)
  const isNamedCallReference = (node: ts.Identifier) => callExpressionOwnsChild(node.parent, node)

  const isNamespaceCallReference = (node: ts.Identifier) => {
    const namedCall = isNamedCallReference(node)

    const namespaceCall = pipe(
      Option.liftPredicate(ts.isPropertyAccessExpression)(node.parent),
      Option.exists((access) => {
        const isObject = strictEqual(node)(access.expression)

        const callExpressionIsAccess = flow(
          Struct.get<ts.CallExpression, "expression">("expression"),
          strictEqual(access)
        )

        const invokesAccess = pipe(
          Option.liftPredicate(ts.isCallExpression)(access.parent),
          Option.exists(callExpressionIsAccess)
        )

        const conditions = Array.make(isObject, invokesAccess)
        return Array.every(conditions, Boolean)
      })
    )

    const callKinds = Array.make(namedCall, namespaceCall)
    return Array.some(callKinds, Boolean)
  }

  const importBindings = (node: ts.ImportDeclaration): ReadonlyArray<ts.Identifier> => {
    const clause = Option.fromNullishOr(node.importClause)

    if (Option.isNone(clause)) {
      return Array.empty()
    }

    const defaultBinding = pipe(Option.fromNullishOr(clause.value.name), Option.toArray)

    const namedBindings = pipe(
      Option.fromNullishOr(clause.value.namedBindings),
      Option.map((bindings) => {
        const namespaceImportNames = (namespaceImport: ts.NamespaceImport) =>
          Array.of(namespaceImport.name)

        const namedImportNames = (namedImports: ts.NamedImports) =>
          Array.map(namedImports.elements, Struct.get("name"))

        return pipe(
          EffectMatch.value(bindings),
          EffectMatch.when(ts.isNamespaceImport, namespaceImportNames),
          EffectMatch.when(ts.isNamedImports, namedImportNames),
          EffectMatch.exhaustive
        )
      }),
      Option.getOrElse(Array.empty)
    )

    return Array.appendAll(defaultBinding, namedBindings)
  }

  const collectImportRecords = (sourceFile: ts.SourceFile): ReadonlyArray<ImportRecord> =>
    Array.filterMap(sourceFile.statements, (statement) => {
      if (!ts.isImportDeclaration(statement)) {
        return Result.failVoid
      }

      const specifier = pipe(
        Option.fromNullishOr(statement.moduleSpecifier),
        Option.filter(ts.isStringLiteral),
        Option.map(Struct.get("text"))
      )

      if (Option.isNone(specifier)) {
        return Result.failVoid
      }

      const bindings = importBindings(statement)

      const counters = Array.map(bindings, (binding) => {
        const isNamespace = ts.isNamespaceImport(binding.parent)
        const referenceCount = MutableRef.make(0)
        const callCount = MutableRef.make(0)

        return new BindingCounter({
          binding,
          importStart: statement.pos,
          importEnd: statement.end,
          isNamespace,
          referenceCount,
          callCount
        })
      })

      const record = new ImportRecord({
        declaration: statement,
        specifier: specifier.value,
        counters
      })

      return Result.succeed(record)
    })

  const indexCounter = (
    countersByName: HashMap.HashMap<string, ReadonlyArray<BindingCounter>>,
    counter: BindingCounter
  ): HashMap.HashMap<string, ReadonlyArray<BindingCounter>> => {
    const counters = pipe(
      HashMap.get(countersByName, counter.binding.text),
      Option.getOrElse(Array.empty),
      Array.append(counter)
    )

    return HashMap.set(countersByName, counter.binding.text, counters)
  }

  const indexRecord = (
    countersByName: HashMap.HashMap<string, ReadonlyArray<BindingCounter>>,
    record: ImportRecord
  ): HashMap.HashMap<string, ReadonlyArray<BindingCounter>> =>
    Array.reduce(record.counters, countersByName, indexCounter)

  const countNode =
    (countersByName: HashMap.HashMap<string, ReadonlyArray<BindingCounter>>) =>
    (state: false, node: ts.Node): false => {
      if (!ts.isIdentifier(node)) {
        return state
      }

      const counters = HashMap.get(countersByName, node.text)

      if (Option.isSome(counters)) {
        Array.forEach(counters.value, (counter) => {
          const startsInsideImport = node.pos >= counter.importStart
          const endsInsideImport = node.end <= counter.importEnd
          const bounds = Array.make(startsInsideImport, endsInsideImport)
          const insideImport = Array.every(bounds, Boolean)

          if (insideImport) {
            return
          }

          MutableRef.increment(counter.referenceCount)

          const isCallReference = counter.isNamespace
            ? isNamespaceCallReference(node)
            : isNamedCallReference(node)

          if (isCallReference) {
            MutableRef.increment(counter.callCount)
          }
        })
      }

      return state
    }

  const importUsageCounts = (sourceFile: ts.SourceFile): ReadonlyArray<ImportRecord> => {
    const records = collectImportRecords(sourceFile)

    if (strictEqual(0)(records.length)) {
      return records
    }

    const emptyCounters = HashMap.empty<string, ReadonlyArray<BindingCounter>>()
    const countersByName = Array.reduce(records, emptyCounters, indexRecord)

    foldAst(countNode(countersByName))(sourceFile)(false)

    return records
  }

  const makeImportedNameUsage = (counter: BindingCounter) => {
    const referenceCount = MutableRef.get(counter.referenceCount)
    const callCount = MutableRef.get(counter.callCount)

    return ImportedNameUsage.make({
      name: counter.binding.text,
      referenceCount,
      callCount
    })
  }

  const relative = toRelativeFileName(context.projectRoot)
  const workspaceRelative = toWorkspacePath(context.projectRoot, context.workspaceRoot)
  const fromTest = isTestSourceFile(context.workspaceRoot)(context.sourceFile)
  const relativePath = relative(context.sourceFile.fileName)
  const importerWorkspacePath = workspaceRelative(relativePath)
  const records = importUsageCounts(context.sourceFile)

  return Array.map(records, (record) => {
    const names = Array.map(record.counters, makeImportedNameUsage)

    const data = ImportUsageData.make({
      specifier: record.moduleSpecifier,
      importerWorkspacePath,
      fromTest,
      names
    })

    return makeNodeMatch(record.declaration, data)
  })
}

export const importUsage = fileMatcher(importUsageElements)
