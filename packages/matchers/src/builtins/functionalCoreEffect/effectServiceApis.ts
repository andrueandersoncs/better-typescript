import { Array, Function, Option, Struct, flow, pipe } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import {
  propertyNameText,
  unwrapCallee,
  unwrapTransparentExpression,
  variableDeclarationInitializer
} from "../../support/tsNode.js"
import { declarationsOfSymbol, emptyHeritageClauses } from "./importedMembers.js"
import { classExtendsEffectApi, importedEffectApiAt } from "./effectApiMembers.js"

const effectServiceMakerObject = (
  expression: ts.Expression
): Option.Option<ts.ObjectLiteralExpression> => {
  if (!ts.isCallExpression(expression)) {
    return Option.none()
  }

  const makerArgument = Array.get(expression.arguments, 1)
  const maker = pipe(makerArgument, Option.filter(ts.isObjectLiteralExpression))

  return Option.isSome(maker) ? maker : effectServiceMakerObject(expression.expression)
}

const contextServiceNames = Array.of("Service")

const makerObjectFromHeritage = (heritage: ts.ExpressionWithTypeArguments) =>
  effectServiceMakerObject(heritage.expression)

export const effectServiceConfigObject = (
  checker: ts.TypeChecker,
  declaration: ts.ClassDeclaration
) => {
  const importedEffectApiAtOf = (callee: ts.Expression) =>
    importedEffectApiAt(checker, callee, "Context", contextServiceNames)

  const heritageTypesOf = (clause: ts.HeritageClause) => Array.fromIterable(clause.types)

  const unwrapHeritageCallee = (heritage: ts.ExpressionWithTypeArguments) =>
    unwrapCallee(heritage.expression)

  return pipe(
    declaration.heritageClauses ?? emptyHeritageClauses,
    Array.flatMap(heritageTypesOf),
    Array.findFirst(flow(unwrapHeritageCallee, importedEffectApiAtOf)),
    Option.flatMap(makerObjectFromHeritage)
  )
}

const contextServiceLayerPropertyNames = Array.of("layer")

const modifierIsStatic = flow(
  Struct.get<ts.ModifierLike, "kind">("kind"),
  strictEqual(ts.SyntaxKind.StaticKeyword)
)

const someStaticModifier = (modifiers: readonly ts.ModifierLike[]) =>
  Array.some(modifiers, modifierIsStatic)

const hasStaticModifier = (declaration: ts.PropertyDeclaration) =>
  pipe(Option.fromNullishOr(declaration.modifiers), Option.exists(someStaticModifier))

const nameIsLayerProperty = (name: string) => Array.contains(contextServiceLayerPropertyNames, name)

const hasLayerStaticProperty = (declaration: ts.PropertyDeclaration) =>
  hasStaticModifier(declaration) &&
  pipe(propertyNameText(declaration.name), Option.exists(nameIsLayerProperty))

const isLayerPropertyDeclaration = (member: ts.ClassElement) =>
  ts.isPropertyDeclaration(member) && hasLayerStaticProperty(member)

export const contextServiceLayerProperty = (declaration: ts.ClassDeclaration) => {
  const members = declaration.members
  return Array.findFirst(members, isLayerPropertyDeclaration)
}

const contextReferenceNames = Array.of("Reference")

const resolvedSymbolAtNode = (checker: ts.TypeChecker) => (node: ts.Node) =>
  pipe(
    checker.getSymbolAtLocation(node),
    Option.fromNullishOr,
    Option.map((symbol) => {
      const alias = (symbol.flags & ts.SymbolFlags.Alias) !== 0
      return alias ? checker.getAliasedSymbol(symbol) : symbol
    })
  )

const callConstructsContextApi = (
  checker: ts.TypeChecker,
  expression: ts.Expression,
  names: ReadonlyArray<string>
): boolean => {
  const current = unwrapTransparentExpression(expression)

  if (!ts.isCallExpression(current)) {
    return importedEffectApiAt(checker, current, "Context", names)
  }

  const callee = unwrapCallee(current.expression)
  const direct = importedEffectApiAt(checker, callee, "Context", names)
  return direct || callConstructsContextApi(checker, current.expression, names)
}

const declarationInitializesContextApi = (
  checker: ts.TypeChecker,
  declaration: ts.Declaration,
  names: ReadonlyArray<string>
) => {
  const callConstructsContextApiOf = (initializer: ts.Expression) =>
    callConstructsContextApi(checker, initializer, names)

  return pipe(
    Option.liftPredicate(ts.isVariableDeclaration)(declaration),
    Option.flatMap(variableDeclarationInitializer),
    Option.exists(callConstructsContextApiOf)
  )
}

export const declarationIsContextService = (
  checker: ts.TypeChecker,
  declaration: ts.Declaration
) => {
  const classExtendsEffectApiOf = (classDeclaration: ts.ClassDeclaration) =>
    classExtendsEffectApi(checker, classDeclaration, "Context", "Service")

  return (
    pipe(
      Option.liftPredicate(ts.isClassDeclaration)(declaration),
      Option.exists(classExtendsEffectApiOf)
    ) || declarationInitializesContextApi(checker, declaration, contextServiceNames)
  )
}

const declarationIsContextReference = (checker: ts.TypeChecker, declaration: ts.Declaration) =>
  declarationInitializesContextApi(checker, declaration, contextReferenceNames)

export const expressionIsServiceTag = (checker: ts.TypeChecker, expression: ts.Expression) => {
  const declarationIsContextServiceOf = (declaration: ts.Declaration) =>
    declarationIsContextService(checker, declaration) ||
    declarationIsContextReference(checker, declaration)

  const someContextServiceDeclaration = (declarations: ReadonlyArray<ts.Declaration>) =>
    Array.some(declarations, declarationIsContextServiceOf)

  return pipe(
    expression,
    unwrapTransparentExpression,
    resolvedSymbolAtNode(checker),
    Option.map(declarationsOfSymbol),
    Option.exists(someContextServiceDeclaration)
  )
}

const provideServiceNames = Array.of("provideService")

const provideServiceTagArgument = (node: ts.CallExpression) => {
  const args = Array.fromIterable(node.arguments)
  const tagIndex = args.length >= 3 ? 1 : 0

  return Array.get(args, tagIndex)
}

export const callIsReferenceProvideService = (checker: ts.TypeChecker, node: ts.CallExpression) => {
  const isProvideService = importedEffectApiAt(
    checker,
    node.expression,
    "Effect",
    provideServiceNames
  )

  const declarationIsContextReferenceCheck = (declaration: ts.Declaration) =>
    declarationIsContextReference(checker, declaration)

  const someContextReferenceDeclaration = (declarations: ReadonlyArray<ts.Declaration>) =>
    Array.some(declarations, declarationIsContextReferenceCheck)

  const referenceOverride = pipe(
    provideServiceTagArgument(node),
    Option.map(unwrapTransparentExpression),
    Option.flatMap(resolvedSymbolAtNode(checker)),
    Option.map(declarationsOfSymbol),
    Option.exists(someContextReferenceDeclaration)
  )

  const checks = Array.make(isProvideService, referenceOverride)

  return Array.every(checks, Boolean)
}

export const effectServiceConfigFromExpression = (
  checker: ts.TypeChecker,
  expression: ts.Expression
) => {
  const current = unwrapTransparentExpression(expression)
  const isContextService = callConstructsContextApi(checker, current, contextServiceNames)
  const keepContextService = Function.constant(isContextService)

  return pipe(
    current,
    Option.liftPredicate(keepContextService),
    Option.flatMap(effectServiceMakerObject)
  )
}
