import * as path from "node:path"
import { Function, Match, Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import {
  namedDetectionTarget,
  outermostTransparentWrapper
} from "./support/tsNode.js"
import { isProjectSourceFile } from "@better-typescript/core/engine/sources"
import { hasCallSignature } from "./support/tsType.js"
import { detection } from "@better-typescript/core/engine/location"
import type { MakeDetection } from "@better-typescript/core/engine/location"
import type { Check, CheckContext } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example"

import {
  fixtureRefactorExamples
} from "../fixtureExamples.js"
type CheckedFunction =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration

type FunctionDefinition = readonly [name: string, reportNode: ts.Node]

type DataStructureModule = readonly [name: string, expectedModulePath: string]

const checkedFunctionKinds: ReadonlyArray<ts.SyntaxKind> = [
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration
]

const isCheckedFunction = (node: ts.Node): node is CheckedFunction =>
  [
    ts.isFunctionDeclaration(node),
    ts.isFunctionExpression(node),
    ts.isArrowFunction(node),
    ts.isMethodDeclaration(node)
  ].some(Boolean)

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

const isDataStructureMember =
  (checker: ts.TypeChecker) =>
  (type: ts.Type): boolean => {
    const exclusions = [
      (type.flags & primitiveTypeFlags) !== 0,
      [checker.isArrayType(type), checker.isTupleType(type)].some(Boolean),
      hasCallSignature(checker)(type)
    ]

    return exclusions.every(isFalse)
  }

const typeFromTypeNode =
  (checker: ts.TypeChecker) =>
  (node: ts.TypeNode): ts.Type =>
    checker.getTypeFromTypeNode(node)

const typeAtLocation =
  (checker: ts.TypeChecker) =>
  (parameter: ts.ParameterDeclaration) =>
  (): ts.Type =>
    checker.getTypeAtLocation(parameter)

const dataStructureModule = (name: string) => {
  const moduleFileName = `${name
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replaceAll("_", "-")
    .toLowerCase()}.ts`
  const expectedModulePath = path.posix.join("modules", moduleFileName)

  return [name, expectedModulePath] as const
}

const isExpectedModulePath =
  (projectRoot: string) =>
  (expectedModulePath: string) =>
  (fileName: string): boolean => {
    const relativeFileName = path.relative(projectRoot, fileName)
    const normalizedFileName = relativeFileName.replaceAll("\\", "/")

    return [
      normalizedFileName === expectedModulePath,
      normalizedFileName.endsWith(`/${expectedModulePath}`)
    ].some(Boolean)
  }

type ModulePathPredicate = (
  expectedModulePath: string
) => (fileName: string) => boolean

const isDataStructureModuleDeclaration =
  (isExpectedModule: ModulePathPredicate) =>
  (symbol: ts.Symbol) =>
  (declaration: ts.Declaration): boolean => {
    const dataStructure = dataStructureModule(symbol.name)
    const sourceFile = declaration.getSourceFile()
    const sourceFileIsProject = isProjectSourceFile(sourceFile)
    const declarationIsDataStructure = [
      ts.isInterfaceDeclaration(declaration),
      ts.isTypeAliasDeclaration(declaration),
      ts.isClassDeclaration(declaration)
    ].some(Boolean)
    const declarationIsExpectedModule = isExpectedModule(dataStructure[1])(
      sourceFile.fileName
    )

    return [
      sourceFileIsProject,
      declarationIsDataStructure,
      declarationIsExpectedModule
    ].every(Boolean)
  }

type TypePredicate = (type: ts.Type) => boolean
type SymbolDeclarationPredicate = (
  symbol: ts.Symbol
) => (declaration: ts.Declaration) => boolean

const dataStructureForSymbol =
  (isMember: TypePredicate) =>
  (isModuleDeclaration: SymbolDeclarationPredicate) =>
  (type: ts.Type) =>
  (symbol: ts.Symbol): Option.Option<DataStructureModule> => {
    const declarations = symbol.declarations ?? []
    const isDeclarationForSymbol = isModuleDeclaration(symbol)
    const isFirstParty = declarations.some(isDeclarationForSymbol)
    const isStructured = type.isUnionOrIntersection()
      ? type.types.every(isMember)
      : isMember(type)
    const isDataStructure = [isFirstParty, isStructured].every(Boolean)
    const dataStructure = dataStructureModule(symbol.name)

    return isDataStructure ? Option.some(dataStructure) : Option.none()
  }

type SymbolDataStructure = (
  type: ts.Type
) => (symbol: ts.Symbol) => Option.Option<DataStructureModule>

const parameterDataStructureCurried =
  (checker: ts.TypeChecker) =>
  (structureForSymbol: SymbolDataStructure) =>
  (parameter: ts.ParameterDeclaration): Option.Option<DataStructureModule> => {
    const type = pipe(
      Option.fromNullable(parameter.type),
      Option.map(typeFromTypeNode(checker)),
      Option.getOrElse(typeAtLocation(checker)(parameter))
    )
    const typeSymbol = type.getSymbol()
    const aliasOrSymbol = type.aliasSymbol ?? typeSymbol
    const symbol = Option.fromNullable(aliasOrSymbol)

    return pipe(symbol, Option.flatMap(structureForSymbol(type)))
  }

const variableDefinition =
  (sourceFile: ts.SourceFile) => (declaration: ts.VariableDeclaration) => {
    const name = declaration.name.getText(sourceFile)

    return [name, declaration.name] as const
  }

type DeclarationDefinition = (
  declaration: ts.VariableDeclaration
) => FunctionDefinition

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

const variableDefinitionFromInitializer =
  (declarationDefinition: DeclarationDefinition) =>
  (expression: ts.Expression): Option.Option<FunctionDefinition> => {
    const parent = expression.parent

    if (!ts.isVariableDeclaration(parent)) {
      return Option.none()
    }

    const definition = declarationDefinition(parent)

    return isVariableInitializer(expression)(parent)
      ? Option.some(definition)
      : Option.none()
  }

const definitionFromCallableDeclaration =
  (checker: ts.TypeChecker) =>
  (declarationDefinition: DeclarationDefinition) =>
  (declaration: ts.VariableDeclaration): Option.Option<FunctionDefinition> => {
    const definition = declarationDefinition(declaration)
    const declarationType = checker.getTypeAtLocation(declaration.name)

    return hasCallSignature(checker)(declarationType)
      ? Option.some(definition)
      : Option.none()
  }

type DefinitionFromDeclaration = (
  declaration: ts.VariableDeclaration
) => Option.Option<FunctionDefinition>

const variableDefinitionFromCallArgument =
  (fromCallable: DefinitionFromDeclaration) =>
  (expression: ts.Expression): Option.Option<FunctionDefinition> => {
    const parent = expression.parent

    if (!ts.isCallExpression(parent)) {
      return Option.none()
    }

    const hasMatchingArgument = parent.arguments.some(
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

const arrowHasBody =
  (expression: ts.Expression) =>
  (arrow: ts.ArrowFunction): boolean =>
    arrow.body === expression

const isArrowWithBody =
  (expression: ts.Expression) =>
  (p: ts.Node): p is ts.ArrowFunction =>
    pipe(
      Option.liftPredicate(ts.isArrowFunction)(p),
      Option.exists(arrowHasBody(expression))
    )

type DefinitionFromExpression = (
  expression: ts.Expression
) => Option.Option<FunctionDefinition>

const findCurriedDefinition =
  (fromInitializer: DefinitionFromExpression) =>
  (fromCallArgument: DefinitionFromExpression) =>
  (fromConcise: DefinitionFromExpression) =>
  (arrowParent: ts.ArrowFunction): Option.Option<FunctionDefinition> => {
    const parentExpression = outermostTransparentWrapper(arrowParent)
    const initializer = fromInitializer(parentExpression)
    const callArgument = fromCallArgument(parentExpression)
    const curried = fromConcise(parentExpression)

    return firstDefinition(initializer)(callArgument)(curried)
  }

const noFunctionDefinition = (): Option.Option<FunctionDefinition> =>
  Option.none()

type CurriedDefinition = (
  arrowParent: ts.ArrowFunction
) => Option.Option<FunctionDefinition>

const conciseCurriedDefinition =
  (findCurried: CurriedDefinition) =>
  (expression: ts.Expression): Option.Option<FunctionDefinition> => {
    const parent = expression.parent

    return pipe(
      Match.value(parent),
      Match.when(isArrowWithBody(expression), findCurried),
      Match.orElse(noFunctionDefinition)
    )
  }

const nameText =
  (sourceFile: ts.SourceFile) =>
  (nameNode: ts.DeclarationName): string =>
    nameNode.getText(sourceFile)

const dataLastModuleMatchForDataStructure =
  (match: MakeDetection) =>
  (isExpectedModule: ModulePathPredicate) =>
  (fileName: string) =>
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

type ParameterDataStructure = (
  parameter: ts.ParameterDeclaration
) => Option.Option<DataStructureModule>
type DataStructureMatch = (
  definition: FunctionDefinition
) => (dataStructure: DataStructureModule) => Option.Option<Detection>

const dataLastModuleMatchForDefinition =
  (parameterStructure: ParameterDataStructure) =>
  (structureMatch: DataStructureMatch) =>
  (node: CheckedFunction) =>
  (definition: FunctionDefinition): Option.Option<Detection> =>
    pipe(
      Option.fromNullable(node.parameters[node.parameters.length - 1]),
      Option.flatMap(parameterStructure),
      Option.flatMap(structureMatch(definition))
    )

const dataLastModuleMatches = (context: CheckContext) => {
  const match = detection(context)
  const isMember = isDataStructureMember(context.checker)
  const isExpectedModule = isExpectedModulePath(context.projectRoot)
  const isModuleDeclaration = isDataStructureModuleDeclaration(isExpectedModule)
  const structureForSymbol =
    dataStructureForSymbol(isMember)(isModuleDeclaration)
  const parameterStructure = parameterDataStructureCurried(context.checker)(
    structureForSymbol
  )
  const declarationDefinition = variableDefinition(context.sourceFile)
  const fromInitializer = variableDefinitionFromInitializer(
    declarationDefinition
  )
  const fromCallable = definitionFromCallableDeclaration(context.checker)(
    declarationDefinition
  )
  const fromCallArgument = variableDefinitionFromCallArgument(fromCallable)
  const findCurriedLazy = (
    arrowParent: ts.ArrowFunction
  ): Option.Option<FunctionDefinition> => findCurried(arrowParent)
  const fromConcise = conciseCurriedDefinition(findCurriedLazy)
  const findCurried =
    findCurriedDefinition(fromInitializer)(fromCallArgument)(fromConcise)
  const definitionName = nameText(context.sourceFile)
  const structureMatch = dataLastModuleMatchForDataStructure(match)(
    isExpectedModule
  )(context.sourceFile.fileName)
  const matchForDefinition =
    dataLastModuleMatchForDefinition(parameterStructure)(structureMatch)

  const matches = (node: CheckedFunction): ReadonlyArray<Detection> => {
    const isFunctionOrMethodDeclaration =
      ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)
    if (isFunctionOrMethodDeclaration) {
      const name = pipe(
        Option.fromNullable(node.name),
        Option.map(definitionName),
        Option.getOrElse(Function.constant("this function"))
      )
      const reportNode = namedDetectionTarget(node)
      const definition: FunctionDefinition = [name, reportNode]

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
