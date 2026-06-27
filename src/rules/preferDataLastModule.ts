import * as path from "node:path"
import { Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { isProjectSourceFile, namedNodeReportTarget, outermostTransparentWrapper } from "./tsNode.js"
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

const hasPrimitiveFlag = (type: ts.Type): boolean => (type.flags & primitiveTypeFlags) !== 0

const isFalse = (value: boolean): boolean => !value

const isArrayLikeType = (context: RuleContext, type: ts.Type): boolean =>
  [context.checker.isArrayType(type), context.checker.isTupleType(type)].some(Boolean)

const isDataStructureMember = (context: RuleContext, type: ts.Type): boolean => {
  const exclusions = [
    hasPrimitiveFlag(type),
    isArrayLikeType(context, type),
    hasCallSignature(context.checker, type)
  ]

  return exclusions.every(isFalse)
}

const isDataStructureMemberOf =
  (context: RuleContext) =>
  (member: ts.Type): boolean =>
    isDataStructureMember(context, member)

const isStructuredDataType = (context: RuleContext, type: ts.Type): boolean => {
  const isDataStructureMemberInContext = isDataStructureMemberOf(context)

  return type.isUnionOrIntersection()
    ? type.types.every(isDataStructureMemberInContext)
    : isDataStructureMember(context, type)
}

const isDataStructureDeclaration = (declaration: ts.Declaration): boolean =>
  [
    ts.isInterfaceDeclaration(declaration),
    ts.isTypeAliasDeclaration(declaration),
    ts.isClassDeclaration(declaration)
  ].some(Boolean)

const parameterType = (context: RuleContext, parameter: ts.ParameterDeclaration): ts.Type => {
  const typeNode = Option.fromNullable(parameter.type)

  return Option.isSome(typeNode)
    ? context.checker.getTypeFromTypeNode(typeNode.value)
    : context.checker.getTypeAtLocation(parameter)
}

const dataStructureSymbol = (type: ts.Type): Option.Option<ts.Symbol> => {
  const symbol = type.getSymbol()
  const aliasOrSymbol = type.aliasSymbol ?? symbol

  return Option.fromNullable(aliasOrSymbol)
}

const kebabCase = (input: string): string =>
  input
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replaceAll("_", "-")
    .toLowerCase()

const dataStructureModule = (name: string) => {
  const moduleFileName = `${kebabCase(name)}.ts`
  const expectedModulePath = path.posix.join("modules", moduleFileName)

  return [name, expectedModulePath] as const
}

const isExpectedModulePath = (
  projectRoot: string,
  fileName: string,
  expectedModulePath: string
): boolean => {
  const relativeFileName = path.relative(projectRoot, fileName)
  const normalizedFileName = relativeFileName.replaceAll("\\", "/")

  return [
    normalizedFileName === expectedModulePath,
    normalizedFileName.endsWith(`/${expectedModulePath}`)
  ].some(Boolean)
}

const isDataStructureModuleDeclaration =
  (context: RuleContext, symbol: ts.Symbol) =>
  (declaration: ts.Declaration): boolean => {
    const dataStructure = dataStructureModule(symbol.name)
    const sourceFile = declaration.getSourceFile()
    const sourceFileIsProject = isProjectSourceFile(sourceFile)
    const declarationIsDataStructure = isDataStructureDeclaration(declaration)
    const declarationIsExpectedModule = isExpectedModulePath(
      context.projectRoot,
      sourceFile.fileName,
      dataStructure[1]
    )

    return [
      sourceFileIsProject,
      declarationIsDataStructure,
      declarationIsExpectedModule
    ].every(Boolean)
  }

const isFirstPartyDataStructureSymbol = (context: RuleContext, symbol: ts.Symbol): boolean => {
  const declarations = symbol.declarations ?? []
  const isDataStructureDeclarationForSymbol = isDataStructureModuleDeclaration(context, symbol)

  return declarations.some(isDataStructureDeclarationForSymbol)
}

const dataStructureForSymbol =
  (context: RuleContext, type: ts.Type) =>
  (symbol: ts.Symbol): Option.Option<DataStructureModule> => {
    const isFirstParty = isFirstPartyDataStructureSymbol(context, symbol)
    const isStructured = isStructuredDataType(context, type)
    const isDataStructure = [isFirstParty, isStructured].every(Boolean)
    const dataStructure = dataStructureModule(symbol.name)

    return isDataStructure ? Option.some(dataStructure) : Option.none()
  }

const parameterDataStructure = (
  context: RuleContext,
  parameter: ts.ParameterDeclaration
): Option.Option<DataStructureModule> => {
  const type = parameterType(context, parameter)
  const symbol = dataStructureSymbol(type)

  return symbol.pipe(Option.flatMap(dataStructureForSymbol(context, type)))
}

const lastParameter = (node: CheckedFunction): Option.Option<ts.ParameterDeclaration> =>
  Option.fromNullable(node.parameters[node.parameters.length - 1])

const lastParameterDataStructure = (
  context: RuleContext,
  node: CheckedFunction
): Option.Option<DataStructureModule> => {
  const parameter = lastParameter(node)

  return Option.isSome(parameter) ? parameterDataStructure(context, parameter.value) : Option.none()
}

const variableDefinition = (context: RuleContext, declaration: ts.VariableDeclaration) => {
  const name = declaration.name.getText(context.sourceFile)

  return [name, declaration.name] as const
}

const sameExpression =
  (expression: ts.Expression) =>
  (candidate: ts.Expression): boolean =>
    candidate === expression

const isVariableInitializer = (
  expression: ts.Expression,
  declaration: ts.VariableDeclaration
): boolean => {
  const initializer = Option.fromNullable(declaration.initializer)

  return Option.exists(initializer, sameExpression(expression))
}

const variableDefinitionFromInitializer = (
  context: RuleContext,
  expression: ts.Expression
): Option.Option<FunctionDefinition> => {
  const parent = expression.parent

  if (!ts.isVariableDeclaration(parent)) {
    return Option.none()
  }

  const definition = variableDefinition(context, parent)

  return isVariableInitializer(expression, parent) ? Option.some(definition) : Option.none()
}

const hasCallableVariableType = (context: RuleContext, declaration: ts.VariableDeclaration): boolean => {
  const declarationType = context.checker.getTypeAtLocation(declaration.name)

  return hasCallSignature(context.checker, declarationType)
}


const isArgumentOfCall = (expression: ts.Expression, callExpression: ts.CallExpression): boolean =>
  callExpression.arguments.some(sameExpression(expression))

const isVariableInitializerFor =
  (expression: ts.Expression) =>
  (declaration: ts.VariableDeclaration): boolean =>
    isVariableInitializer(expression, declaration)

const callExpressionVariableDeclaration = (
  callExpression: ts.CallExpression
): Option.Option<ts.VariableDeclaration> => {
  const expression = outermostTransparentWrapper(callExpression)
  const parent = expression.parent
  const declaration = Option.liftPredicate(ts.isVariableDeclaration)(parent)

  return declaration.pipe(Option.filter(isVariableInitializerFor(expression)))
}

const definitionFromCallableDeclaration =
  (context: RuleContext) =>
  (declaration: ts.VariableDeclaration): Option.Option<FunctionDefinition> => {
    const definition = variableDefinition(context, declaration)

    return hasCallableVariableType(context, declaration) ? Option.some(definition) : Option.none()
  }

const variableDefinitionFromCallExpressionArgument = (
  context: RuleContext,
  expression: ts.Expression,
  callExpression: ts.CallExpression
): Option.Option<FunctionDefinition> => {
  if (!isArgumentOfCall(expression, callExpression)) {
    return Option.none()
  }

  const declaration = callExpressionVariableDeclaration(callExpression)

  return declaration.pipe(Option.flatMap(definitionFromCallableDeclaration(context)))
}

const variableDefinitionFromCallArgument = (
  context: RuleContext,
  expression: ts.Expression
): Option.Option<FunctionDefinition> => {
  const parent = expression.parent

  return ts.isCallExpression(parent)
    ? variableDefinitionFromCallExpressionArgument(context, expression, parent)
    : Option.none()
}

const firstDefinition = (
  initializer: Option.Option<FunctionDefinition>,
  callArgument: Option.Option<FunctionDefinition>,
  curried: Option.Option<FunctionDefinition>
): Option.Option<FunctionDefinition> => {
  const initializerOrCallArgument = Option.isSome(initializer) ? initializer : callArgument

  return Option.isSome(initializerOrCallArgument) ? initializerOrCallArgument : curried
}

const conciseArrowCurriedDefinition = (
  context: RuleContext,
  expression: ts.Expression,
  parent: ts.ArrowFunction
): Option.Option<FunctionDefinition> => {
  if (parent.body !== expression) {
    return Option.none()
  }

  const parentExpression = outermostTransparentWrapper(parent)
  const initializer = variableDefinitionFromInitializer(context, parentExpression)
  const callArgument = variableDefinitionFromCallArgument(context, parentExpression)
  const curried = conciseCurriedDefinition(context, parentExpression)

  return firstDefinition(initializer, callArgument, curried)
}

const conciseFunctionCurriedDefinition = (
  context: RuleContext,
  expression: ts.Expression,
  parent: CheckedFunction
): Option.Option<FunctionDefinition> =>
  ts.isArrowFunction(parent)
    ? conciseArrowCurriedDefinition(context, expression, parent)
    : Option.none()

const conciseCurriedDefinition = (
  context: RuleContext,
  expression: ts.Expression
): Option.Option<FunctionDefinition> => {
  const parent = expression.parent

  return isCheckedFunction(parent)
    ? conciseFunctionCurriedDefinition(context, expression, parent)
    : Option.none()
}

const namedFunctionDefinition = (
  context: RuleContext,
  node: ts.FunctionDeclaration | ts.MethodDeclaration
) => {
  const nameNode = Option.fromNullable(node.name)
  const name = Option.isSome(nameNode) ? nameNode.value.getText(context.sourceFile) : "this function"
  const reportNode = namedNodeReportTarget(node)

  return [name, reportNode] as const
}

const expressionFunctionDefinition = (
  context: RuleContext,
  node: ts.ArrowFunction | ts.FunctionExpression
): Option.Option<FunctionDefinition> => {
  const expression = outermostTransparentWrapper(node)
  const initializer = variableDefinitionFromInitializer(context, expression)
  const callArgument = variableDefinitionFromCallArgument(context, expression)
  const curried = conciseCurriedDefinition(context, expression)

  return firstDefinition(initializer, callArgument, curried)
}

const namedDefinitionOption = (
  context: RuleContext,
  node: ts.FunctionDeclaration | ts.MethodDeclaration
): Option.Option<FunctionDefinition> => {
  const definition = namedFunctionDefinition(context, node)

  return Option.some(definition)
}

const isNamedCheckedFunction = (
  node: CheckedFunction
): node is ts.FunctionDeclaration | ts.MethodDeclaration =>
  [ts.isFunctionDeclaration(node), ts.isMethodDeclaration(node)].some(Boolean)

const functionDefinition = (
  context: RuleContext,
  node: CheckedFunction
): Option.Option<FunctionDefinition> =>
  isNamedCheckedFunction(node)
    ? namedDefinitionOption(context, node)
    : expressionFunctionDefinition(context, node)

const isExpectedModuleFile = (context: RuleContext, expectedModulePath: string): boolean =>
  isExpectedModulePath(context.projectRoot, context.sourceFile.fileName, expectedModulePath)

const dataLastModuleMatch = (
  context: RuleContext,
  dataStructure: DataStructureModule,
  definition: FunctionDefinition
): RuleMatch =>
  createRuleMatch(context, {
    ruleId,
    node: definition[1],
    message:
      `Avoid defining ${definition[0]} outside ${dataStructure[1]} when ` +
      `its last parameter is ${dataStructure[0]}.`,
    hint:
      `Move ${definition[0]} to ${dataStructure[1]} so data-last ` +
      `functions for ${dataStructure[0]} live with the ${dataStructure[0]} data structure.`
  })

const dataLastModuleMatchForDataStructure =
  (context: RuleContext, definition: FunctionDefinition) =>
  (dataStructure: DataStructureModule): Option.Option<RuleMatch> => {
    const match = dataLastModuleMatch(context, dataStructure, definition)

    return isExpectedModuleFile(context, dataStructure[1]) ? Option.none() : Option.some(match)
  }

const dataLastModuleMatchForDefinition =
  (context: RuleContext, node: CheckedFunction) =>
  (definition: FunctionDefinition): Option.Option<RuleMatch> => {
    const dataStructure = lastParameterDataStructure(context, node)

    return dataStructure.pipe(Option.flatMap(dataLastModuleMatchForDataStructure(context, definition)))
  }

const dataLastModuleMatches = (
  node: CheckedFunction,
  context: RuleContext
): ReadonlyArray<RuleMatch> =>
  functionDefinition(context, node).pipe(
    Option.flatMap(dataLastModuleMatchForDefinition(context, node)),
    Option.toArray
  )

const check = onNode(checkedFunctionKinds, isCheckedFunction, dataLastModuleMatches)

const badExample = new ExampleSnippet({
  filePath: "src/cases.ts",
  code: `import type { User } from "./modules/user.js"

const updateUser = (id: string, newData: User): User => newData`
})

const goodExample = new ExampleSnippet({
  filePath: "src/modules/user.ts",
  code: `export interface User {
  readonly name: string
}

export const updateUser = (id: string, newData: User): User => newData`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const preferDataLastModule = new Rule({
  id: ruleId,
  description:
    "Require functions whose last parameter is a first-party data structure to live in that data structure's module.",
  example,
  check
})
