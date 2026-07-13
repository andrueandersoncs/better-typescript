import * as path from "node:path"
import { Tuple, Array, Function, pipe, Option } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import {
  namedDetectionTarget,
  outermostTransparentWrapper
} from "./support/tsNode.js"
import { isProjectSourceFile } from "@better-typescript/core/engine/sources"
import { hasCallSignature } from "./support/tsType.js"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"

type CheckedFunction =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration

type FunctionDefinition = readonly [name: string, reportNode: ts.Node]

type DataStructureModule = readonly [name: string, expectedModulePath: string]

const checkedFunctionKinds: ReadonlyArray<ts.SyntaxKind> = Array.make(
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration
)

const isCheckedFunction = (node: ts.Node): node is CheckedFunction => {
  const isFunctionDeclaration = ts.isFunctionDeclaration(node)
  const isFunctionExpression = ts.isFunctionExpression(node)
  const isArrowFunction = ts.isArrowFunction(node)
  const isMethodDeclaration = ts.isMethodDeclaration(node)

  const functionLikeConditions = Array.make(
    isFunctionDeclaration,
    isFunctionExpression,
    isArrowFunction,
    isMethodDeclaration
  )

  return Array.some(functionLikeConditions, Boolean)
}

const primitiveTypeFlags =
  ts.TypeFlags.Any |
  ts.TypeFlags.Unknown |
  ts.TypeFlags.Never |
  ts.TypeFlags.Void |
  ts.TypeFlags.Undefined |
  ts.TypeFlags.Null |
  ts.TypeFlags.BooleanLike |
  ts.TypeFlags.NumberLike |
  ts.TypeFlags.BigIntLike |
  ts.TypeFlags.StringLike |
  ts.TypeFlags.ESSymbolLike |
  ts.TypeFlags.EnumLike

const isFalse = (value: boolean): boolean => !value

const dataStructureModule = (name: string) => {
  const moduleFileName = `${name
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replaceAll("_", "-")
    .toLowerCase()}.ts`

  const expectedModulePath = path.posix.join("modules", moduleFileName)

  return Tuple.make(name, expectedModulePath)
}

const sameExpression =
  (expression: ts.Expression) =>
  (candidate: ts.Expression): boolean =>
    candidate === expression

const isVariableInitializer =
  (expression: ts.Expression) =>
  (declaration: ts.VariableDeclaration): boolean => {
    const initializer = Option.fromNullable(declaration.initializer)

    return Option.exists(initializer, sameExpression(expression))
  }

const firstDefinition =
  (initializer: Option.Option<FunctionDefinition>) =>
  (callArgument: Option.Option<FunctionDefinition>) =>
  (
    curried: Option.Option<FunctionDefinition>
  ): Option.Option<FunctionDefinition> => {
    const initializerOrCallArgument = Option.isSome(initializer)
      ? initializer
      : callArgument

    return Option.isSome(initializerOrCallArgument)
      ? initializerOrCallArgument
      : curried
  }

const dataLastModuleMatches = (context: CheckContext) => {
  const match = detection(context)
  const checker = context.checker
  const projectRoot = context.projectRoot
  const sourceFile = context.sourceFile
  const fileName = sourceFile.fileName

  const isMember = (type: ts.Type): boolean => {
    const isArrayType = checker.isArrayType(type)
    const isTupleType = checker.isTupleType(type)

    const arrayOrTupleChecks = Array.make(isArrayType, isTupleType)

    const isArrayOrTuple = Array.some(arrayOrTupleChecks, Boolean)
    const typeHasCallSignature = hasCallSignature(checker)(type)

    const exclusions = Array.make(
      (type.flags & primitiveTypeFlags) !== 0,
      isArrayOrTuple,
      typeHasCallSignature
    )

    return Array.every(exclusions, isFalse)
  }

  const isExpectedModule =
    (expectedModulePath: string) =>
    (candidateFileName: string): boolean => {
      const relativeFileName = path.relative(projectRoot, candidateFileName)
      const normalizedFileName = relativeFileName.replaceAll("\\", "/")

      const endsWithModulePath = normalizedFileName.endsWith(
        `/${expectedModulePath}`
      )

      const checks = Array.make(
        normalizedFileName === expectedModulePath,
        endsWithModulePath
      )

      return Array.some(checks, Boolean)
    }

  const isModuleDeclaration =
    (symbol: ts.Symbol) =>
    (declaration: ts.Declaration): boolean => {
      const dataStructure = dataStructureModule(symbol.name)
      const declarationSourceFile = declaration.getSourceFile()
      const sourceFileIsProject = isProjectSourceFile(declarationSourceFile)

      const isInterfaceDeclaration = ts.isInterfaceDeclaration(declaration)
      const isTypeAliasDeclaration = ts.isTypeAliasDeclaration(declaration)
      const isClassDeclaration = ts.isClassDeclaration(declaration)

      const conditions = Array.make(
        isInterfaceDeclaration,
        isTypeAliasDeclaration,
        isClassDeclaration
      )

      const declarationIsDataStructure = Array.some(conditions, Boolean)

      const declarationIsExpectedModule = isExpectedModule(dataStructure[1])(
        declarationSourceFile.fileName
      )

      const dataStructureModuleConditions = Array.make(
        sourceFileIsProject,
        declarationIsDataStructure,
        declarationIsExpectedModule
      )

      return Array.every(dataStructureModuleConditions, Boolean)
    }

  const structureForSymbol =
    (type: ts.Type) =>
    (symbol: ts.Symbol): Option.Option<DataStructureModule> => {
      const declarations = symbol.declarations ?? Array.empty()
      const isDeclarationForSymbol = isModuleDeclaration(symbol)
      const isFirstParty = Array.some(declarations, isDeclarationForSymbol)

      const isStructured = type.isUnionOrIntersection()
        ? Array.every(type.types, isMember)
        : isMember(type)

      const firstPartyStructureConditions = Array.make(
        isFirstParty,
        isStructured
      )

      const isDataStructure = Array.every(
        firstPartyStructureConditions,
        Boolean
      )

      const dataStructure = dataStructureModule(symbol.name)

      return isDataStructure ? Option.some(dataStructure) : Option.none()
    }

  const parameterStructure = (
    parameter: ts.ParameterDeclaration
  ): Option.Option<DataStructureModule> => {
    const type = pipe(
      Option.fromNullable(parameter.type),
      Option.map((node) => checker.getTypeFromTypeNode(node)),
      Option.getOrElse(() => checker.getTypeAtLocation(parameter))
    )

    const typeSymbol = type.getSymbol()
    const aliasOrSymbol = type.aliasSymbol ?? typeSymbol
    const symbol = Option.fromNullable(aliasOrSymbol)

    return pipe(symbol, Option.flatMap(structureForSymbol(type)))
  }

  const declarationDefinition = (
    declaration: ts.VariableDeclaration
  ): FunctionDefinition => {
    const name = declaration.name.getText(sourceFile)

    return Tuple.make(name, declaration.name)
  }

  const fromInitializer = (
    expression: ts.Expression
  ): Option.Option<FunctionDefinition> => {
    const parent = expression.parent

    if (!ts.isVariableDeclaration(parent)) {
      return Option.none()
    }

    const definition = declarationDefinition(parent)

    return isVariableInitializer(expression)(parent)
      ? Option.some(definition)
      : Option.none()
  }

  const fromCallable = (
    declaration: ts.VariableDeclaration
  ): Option.Option<FunctionDefinition> => {
    const definition = declarationDefinition(declaration)
    const declarationType = checker.getTypeAtLocation(declaration.name)

    return hasCallSignature(checker)(declarationType)
      ? Option.some(definition)
      : Option.none()
  }

  const fromCallArgument = (
    expression: ts.Expression
  ): Option.Option<FunctionDefinition> => {
    const parent = expression.parent

    if (!ts.isCallExpression(parent)) {
      return Option.none()
    }

    const hasMatchingArgument = Array.some(
      parent.arguments,
      sameExpression(expression)
    )

    if (!hasMatchingArgument) {
      return Option.none()
    }

    const wrappedExpression = outermostTransparentWrapper(parent)
    const wrappedParent = wrappedExpression.parent

    const declaration = pipe(
      Option.liftPredicate(ts.isVariableDeclaration)(wrappedParent),
      Option.filter(isVariableInitializer(wrappedExpression))
    )

    return pipe(declaration, Option.flatMap(fromCallable))
  }

  const findCurriedLazy = (
    arrowParent: ts.ArrowFunction
  ): Option.Option<FunctionDefinition> => pipe(arrowParent, findCurried)

  const fromConcise = (
    expression: ts.Expression
  ): Option.Option<FunctionDefinition> =>
    pipe(
      expression.parent,
      Option.liftPredicate(ts.isArrowFunction),
      Option.filter((arrow) => arrow.body === expression),
      Option.flatMap(findCurriedLazy)
    )

  const findCurried = (
    arrowParent: ts.ArrowFunction
  ): Option.Option<FunctionDefinition> => {
    const parentExpression = outermostTransparentWrapper(arrowParent)
    const initializer = fromInitializer(parentExpression)
    const callArgument = fromCallArgument(parentExpression)
    const curried = fromConcise(parentExpression)

    return firstDefinition(initializer)(callArgument)(curried)
  }

  const structureMatch =
    (definition: FunctionDefinition) =>
    (dataStructure: DataStructureModule): Option.Option<Detection> => {
      const ruleMatch = match({
        node: definition[1],
        message:
          `Avoid defining ${definition[0]} outside ${dataStructure[1]} when ` +
          `its last parameter is ${dataStructure[0]}.`,
        hint:
          `Move ${definition[0]} to ${dataStructure[1]} so data-last ` +
          `functions for ${dataStructure[0]} live with the ${dataStructure[0]} data structure.`
      })

      return isExpectedModule(dataStructure[1])(fileName)
        ? Option.none()
        : Option.some(ruleMatch)
    }

  const matchForDefinition =
    (node: CheckedFunction) =>
    (definition: FunctionDefinition): Option.Option<Detection> =>
      pipe(
        Option.fromNullable(node.parameters[node.parameters.length - 1]),
        Option.flatMap(parameterStructure),
        Option.flatMap(structureMatch(definition))
      )

  const matches = (node: CheckedFunction): ReadonlyArray<Detection> => {
    const isFunctionOrMethodDeclaration =
      ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)

    if (isFunctionOrMethodDeclaration) {
      const name = pipe(
        Option.fromNullable(node.name),
        Option.map((nameNode) => nameNode.getText(sourceFile)),
        Option.getOrElse(Function.constant("this function"))
      )

      const reportNode = namedDetectionTarget(node)
      const definition: FunctionDefinition = Tuple.make(name, reportNode)

      return pipe(
        Option.some(definition),
        Option.flatMap(matchForDefinition(node)),
        Option.toArray
      )
    }

    const expression = outermostTransparentWrapper(node)
    const initializer = fromInitializer(expression)
    const callArgument = fromCallArgument(expression)
    const curried = fromConcise(expression)

    return pipe(
      firstDefinition(initializer)(callArgument)(curried),
      Option.flatMap(matchForDefinition(node)),
      Option.toArray
    )
  }

  return matches
}

const check = nodeCheck(checkedFunctionKinds)(isCheckedFunction)(
  dataLastModuleMatches
)

export const preferDataLastModule: Check = check

export const preferDataLastModuleExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("prefer-data-last-module")
