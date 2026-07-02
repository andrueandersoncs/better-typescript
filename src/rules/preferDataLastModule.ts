import * as path from "node:path"
import { Function, Match, Option, pipe } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import {
  isProjectSourceFile,
  namedNodeReportTarget,
  outermostTransparentWrapper
} from "./tsNode.js"
import { hasCallSignature } from "./tsType.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "prefer-data-last-module"

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
  (context: RuleContext) =>
  (type: ts.Type): boolean => {
    const exclusions = [
      (type.flags & primitiveTypeFlags) !== 0,
      [
        context.checker.isArrayType(type),
        context.checker.isTupleType(type)
      ].some(Boolean),
      hasCallSignature(context.checker)(type)
    ]

    return exclusions.every(isFalse)
  }

const isDataStructureMemberOf =
  (context: RuleContext) =>
  (member: ts.Type): boolean =>
    isDataStructureMember(context)(member)

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

const isDataStructureModuleDeclaration =
  (context: RuleContext) =>
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
    const declarationIsExpectedModule = isExpectedModulePath(
      context.projectRoot
    )(dataStructure[1])(sourceFile.fileName)

    return [
      sourceFileIsProject,
      declarationIsDataStructure,
      declarationIsExpectedModule
    ].every(Boolean)
  }

const dataStructureForSymbol =
  (context: RuleContext) =>
  (type: ts.Type) =>
  (symbol: ts.Symbol): Option.Option<DataStructureModule> => {
    const declarations = symbol.declarations ?? []
    const isDataStructureDeclarationForSymbol =
      isDataStructureModuleDeclaration(context)(symbol)
    const isFirstParty = declarations.some(isDataStructureDeclarationForSymbol)
    const isDataStructureMemberInContext = isDataStructureMemberOf(context)
    const isStructured = type.isUnionOrIntersection()
      ? type.types.every(isDataStructureMemberInContext)
      : isDataStructureMember(context)(type)
    const isDataStructure = [isFirstParty, isStructured].every(Boolean)
    const dataStructure = dataStructureModule(symbol.name)

    return isDataStructure ? Option.some(dataStructure) : Option.none()
  }

const parameterDataStructureCurried =
  (context: RuleContext) =>
  (parameter: ts.ParameterDeclaration): Option.Option<DataStructureModule> => {
    const type = pipe(
      Option.fromNullable(parameter.type),
      Option.map(typeFromTypeNode(context.checker)),
      Option.getOrElse(typeAtLocation(context.checker)(parameter))
    )
    const typeSymbol = type.getSymbol()
    const aliasOrSymbol = type.aliasSymbol ?? typeSymbol
    const symbol = Option.fromNullable(aliasOrSymbol)

    return pipe(symbol, Option.flatMap(dataStructureForSymbol(context)(type)))
  }

const variableDefinition =
  (context: RuleContext) => (declaration: ts.VariableDeclaration) => {
    const name = declaration.name.getText(context.sourceFile)

    return [name, declaration.name] as const
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

const variableDefinitionFromInitializer =
  (context: RuleContext) =>
  (expression: ts.Expression): Option.Option<FunctionDefinition> => {
    const parent = expression.parent

    if (!ts.isVariableDeclaration(parent)) {
      return Option.none()
    }

    const definition = variableDefinition(context)(parent)

    return isVariableInitializer(expression)(parent)
      ? Option.some(definition)
      : Option.none()
  }

const isVariableInitializerFor =
  (expression: ts.Expression) =>
  (declaration: ts.VariableDeclaration): boolean =>
    isVariableInitializer(expression)(declaration)

const definitionFromCallableDeclaration =
  (context: RuleContext) =>
  (declaration: ts.VariableDeclaration): Option.Option<FunctionDefinition> => {
    const definition = variableDefinition(context)(declaration)
    const declarationType = context.checker.getTypeAtLocation(declaration.name)

    return hasCallSignature(context.checker)(declarationType)
      ? Option.some(definition)
      : Option.none()
  }

const variableDefinitionFromCallArgument =
  (context: RuleContext) =>
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
      Option.filter(isVariableInitializerFor(wrappedExpression))
    )

    return pipe(
      declaration,
      Option.flatMap(definitionFromCallableDeclaration(context))
    )
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

const findCurriedDefinition =
  (context: RuleContext) =>
  (arrowParent: ts.ArrowFunction): Option.Option<FunctionDefinition> => {
    const parentExpression = outermostTransparentWrapper(arrowParent)
    const initializer =
      variableDefinitionFromInitializer(context)(parentExpression)
    const callArgument =
      variableDefinitionFromCallArgument(context)(parentExpression)
    const curried = conciseCurriedDefinition(context)(parentExpression)

    return firstDefinition(initializer)(callArgument)(curried)
  }

const noFunctionDefinition = (): Option.Option<FunctionDefinition> =>
  Option.none()

const conciseCurriedDefinition =
  (context: RuleContext) =>
  (expression: ts.Expression): Option.Option<FunctionDefinition> => {
    const parent = expression.parent

    return pipe(
      Match.value(parent),
      Match.when(isArrowWithBody(expression), findCurriedDefinition(context)),
      Match.orElse(noFunctionDefinition)
    )
  }

const nameText =
  (sourceFile: ts.SourceFile) =>
  (nameNode: ts.DeclarationName): string =>
    nameNode.getText(sourceFile)

const dataLastModuleMatchForDataStructure =
  (context: RuleContext) =>
  (definition: FunctionDefinition) =>
  (dataStructure: DataStructureModule): Option.Option<RuleMatch> => {
    const match = createRuleMatch(context)({
      ruleId,
      node: definition[1],
      message:
        `Avoid defining ${definition[0]} outside ${dataStructure[1]} when ` +
        `its last parameter is ${dataStructure[0]}.`,
      hint:
        `Move ${definition[0]} to ${dataStructure[1]} so data-last ` +
        `functions for ${dataStructure[0]} live with the ${dataStructure[0]} data structure.`
    })

    return isExpectedModulePath(context.projectRoot)(dataStructure[1])(
      context.sourceFile.fileName
    )
      ? Option.none()
      : Option.some(match)
  }

const dataLastModuleMatchForDefinition =
  (context: RuleContext) =>
  (node: CheckedFunction) =>
  (definition: FunctionDefinition): Option.Option<RuleMatch> =>
    pipe(
      Option.fromNullable(node.parameters[node.parameters.length - 1]),
      Option.flatMap(parameterDataStructureCurried(context)),
      Option.flatMap(dataLastModuleMatchForDataStructure(context)(definition))
    )

const dataLastModuleMatches =
  (context: RuleContext) =>
  (node: CheckedFunction): ReadonlyArray<RuleMatch> => {
    const isFunctionOrMethodDeclaration =
      ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)
    if (isFunctionOrMethodDeclaration) {
      const name = pipe(
        Option.fromNullable(node.name),
        Option.map(nameText(context.sourceFile)),
        Option.getOrElse(Function.constant("this function"))
      )
      const reportNode = namedNodeReportTarget(node)
      const definition: FunctionDefinition = [name, reportNode]

      return pipe(
        Option.some(definition),
        Option.flatMap(dataLastModuleMatchForDefinition(context)(node)),
        Option.toArray
      )
    }

    const expression = outermostTransparentWrapper(node)
    const initializer = variableDefinitionFromInitializer(context)(expression)
    const callArgument = variableDefinitionFromCallArgument(context)(expression)
    const curried = conciseCurriedDefinition(context)(expression)

    return pipe(
      firstDefinition(initializer)(callArgument)(curried),
      Option.flatMap(dataLastModuleMatchForDefinition(context)(node)),
      Option.toArray
    )
  }

const check = onNode(checkedFunctionKinds)(isCheckedFunction)(
  dataLastModuleMatches
)

const contextExample = new ExampleSnippet({
  filePath: "src/modules/user.ts",
  code: `export interface User {
  readonly name: string
}`
})

const badExample = new ExampleSnippet({
  filePath: "src/cases.ts",
  code: `import type { User } from "./modules/user.js"

export const updateUser =
  (id: string) =>
  (newData: User): User =>
    newData`
})

const goodExample = new ExampleSnippet({
  filePath: "src/modules/user.ts",
  code: `export interface User {
  readonly name: string
}

export const updateUser =
  (id: string) =>
  (newData: User): User =>
    newData`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample],
  context: [contextExample]
})

export const preferDataLastModule = new Rule({
  id: ruleId,
  description:
    "Require functions whose last parameter is a first-party data structure to live in that data structure's module.",
  example,
  check
})
