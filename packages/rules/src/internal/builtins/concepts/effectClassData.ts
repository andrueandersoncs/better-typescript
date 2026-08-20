import { emptyHeritageClauses } from "../../support/effectApi/emptyHeritageClauses.js"
import { Array, Function, HashSet, Option, Result, Struct, pipe } from "effect"
import { strictEqual } from "../../equivalence.js"
import * as ts from "typescript"
import { isExtendsClause } from "../../support/isExtendsClause.js"
import { symbolDeclarations } from "../../support/symbolDeclarations.js"
import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"
import { unwrapCallee } from "../../support/unwrapCallee.js"
import { variableDeclarationInitializer } from "../../support/variableDeclarationInitializer.js"
import { symbolDeclaredInEffectPackage } from "../../support/declarationInEffectPackage.js"
import { EffectDataClass } from "./effectDataClass.js"
import { schemaDataClass } from "./schemaDataClass.js"
import { canonicalSymbol } from "../../support/canonicalSymbol.js"
import { symbolAt } from "./symbolAt.js"

export const effectDataMembers = HashSet.make(
  "Class",
  "Error",
  "ErrorClass",
  "Opaque",
  "TaggedClass",
  "TaggedError",
  "TaggedErrorClass",
  "asClass"
)

export const effectProtocolMembers = HashSet.make(
  "Error",
  "ErrorClass",
  "TaggedClass",
  "TaggedError",
  "TaggedErrorClass"
)

export const effectErrorMembers = HashSet.make(
  "Error",
  "ErrorClass",
  "TaggedError",
  "TaggedErrorClass"
)

export const schemaOnlyDataMembers = HashSet.make(
  "ErrorClass",
  "Opaque",
  "TaggedErrorClass",
  "asClass"
)

export const symbolDeclaredInSchemaModule = (symbol: ts.Symbol) => {
  const declarations = symbolDeclarations(symbol) ?? Array.empty()

  return Array.some(declarations, (declaration) => {
    const fileName = declaration.getSourceFile().fileName.replaceAll("\\", "/")
    const isSourceModule = fileName.endsWith("/Schema.ts")
    const isDeclarationModule = fileName.endsWith("/Schema.d.ts")
    const moduleChecks = Array.make(isSourceModule, isDeclarationModule)

    return Array.some(moduleChecks, Boolean)
  })
}

export const effectDataClassForSymbol = (
  symbol: ts.Symbol
): Option.Option<typeof schemaDataClass> => {
  const member = symbol.getName()

  const isEffectMember =
    symbolDeclaredInEffectPackage(symbol) && HashSet.has(effectDataMembers, member)

  if (!isEffectMember) {
    return Option.none()
  }

  const runtimeSchema =
    HashSet.has(schemaOnlyDataMembers, member) || symbolDeclaredInSchemaModule(symbol)

  const protocol = HashSet.has(effectProtocolMembers, member)
  const errorLike = HashSet.has(effectErrorMembers, member)

  const data = new EffectDataClass({
    protocol,
    runtimeSchema,
    errorLike
  })

  return Option.some(data)
}

export const heritageClauseTypesHead = (clause: ts.HeritageClause) => Array.head(clause.types)

export const classHeritageExpression = (
  declaration: ts.ClassDeclaration
): Option.Option<ts.Expression> =>
  pipe(
    declaration.heritageClauses ?? emptyHeritageClauses,
    Array.findFirst(isExtendsClause),
    Option.flatMap(heritageClauseTypesHead),
    Option.map(Struct.get("expression"))
  )

export const classDataForDeclaration =
  (checker: ts.TypeChecker) =>
  (visited: ReadonlyArray<ts.Symbol>) =>
  (declaration: ts.ClassDeclaration): Option.Option<typeof schemaDataClass> => {
    const classDataFromExpression = classDataForExpression(checker)(visited)

    return pipe(classHeritageExpression(declaration), Option.flatMap(classDataFromExpression))
  }

export const classDataForSymbol =
  (checker: ts.TypeChecker) =>
  (visited: ReadonlyArray<ts.Symbol>) =>
  (symbol: ts.Symbol): Option.Option<typeof schemaDataClass> => {
    const resolved = canonicalSymbol(checker)(symbol)
    const direct = effectDataClassForSymbol(resolved)
    const candidateEqualsResolved = strictEqual(resolved)
    const alreadyVisited = Array.some(visited, candidateEqualsResolved)
    const directFound = Option.isSome(direct)
    const stopSearch = directFound || alreadyVisited

    if (stopSearch) {
      return direct
    }

    const nextVisited = Array.append(visited, resolved)
    const declarations = symbolDeclarations(resolved) ?? Array.empty<ts.Declaration>()

    return pipe(
      declarations,
      Array.filterMap((declaration) => {
        const classDataFromDeclaration = classDataForDeclaration(checker)(nextVisited)
        const classDataFromInitializer = classDataForExpression(checker)(nextVisited)

        const classData = pipe(
          Option.liftPredicate(ts.isClassDeclaration)(declaration),
          Option.flatMap(classDataFromDeclaration)
        )

        const variableData = pipe(
          Option.liftPredicate(ts.isVariableDeclaration)(declaration),
          Option.flatMap(variableDeclarationInitializer),
          Option.flatMap(classDataFromInitializer)
        )

        return pipe(
          classData,
          Option.orElse(Function.constant(variableData)),
          Result.fromOption(Function.constVoid)
        )
      }),
      Array.head
    )
  }

export const classDataForExpression =
  (checker: ts.TypeChecker) =>
  (visited: ReadonlyArray<ts.Symbol>) =>
  (expression: ts.Expression): Option.Option<typeof schemaDataClass> => {
    const unwrapped = unwrapTransparentExpression(expression)
    const callee = unwrapCallee(unwrapped)

    const accessNameIsExtend = (access: ts.PropertyAccessExpression) =>
      strictEqual("extend")(access.name.text)

    const extension = pipe(
      Option.liftPredicate(ts.isPropertyAccessExpression)(callee),
      Option.filter(accessNameIsExtend)
    )

    if (Option.isSome(extension)) {
      const inherited = classDataForExpression(checker)(visited)(extension.value.expression)

      const inheritedSchema = pipe(
        inherited,
        Option.map((data) => new EffectDataClass({ ...data, runtimeSchema: true }))
      )

      const effectExtension = pipe(
        symbolAt(checker)(extension.value.name),
        Option.filter(symbolDeclaredInEffectPackage),
        Option.as(schemaDataClass)
      )

      return pipe(inheritedSchema, Option.orElse(Function.constant(effectExtension)))
    }

    const reference = ts.isPropertyAccessExpression(callee) ? callee.name : callee
    const classDataFromSymbol = classDataForSymbol(checker)(visited)

    return pipe(
      Option.liftPredicate(ts.isIdentifier)(reference),
      Option.flatMap(symbolAt(checker)),
      Option.flatMap(classDataFromSymbol)
    )
  }
