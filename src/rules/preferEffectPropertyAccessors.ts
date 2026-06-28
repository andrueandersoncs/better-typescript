import { Function, Option, Struct } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { unwrapTransparentExpression } from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "prefer-effect-property-accessors"

type PropertyAccessorFunction =
  | ts.ArrowFunction
  | ts.FunctionExpression
  | ts.FunctionDeclaration
  | ts.MethodDeclaration

const propertyAccessorFunctionKinds: ReadonlyArray<ts.SyntaxKind> = [
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.MethodDeclaration
]

const isPropertyAccessorFunction = (
  node: ts.Node
): node is PropertyAccessorFunction =>
  [
    ts.isArrowFunction(node),
    ts.isFunctionExpression(node),
    ts.isFunctionDeclaration(node),
    ts.isMethodDeclaration(node)
  ].some(Boolean)

const returnExpression = (
  statement: ts.Statement
): Option.Option<ts.Expression> =>
  ts.isReturnStatement(statement)
    ? Option.fromNullable(statement.expression)
    : Option.none()

const hasOneStatement = (body: ts.Block): boolean =>
  body.statements.length === 1

const firstStatement = (body: ts.Block): Option.Option<ts.Statement> =>
  Option.fromNullable(body.statements[0])

const singleReturnExpression = (
  body: ts.Block
): Option.Option<ts.Expression> => {
  const statement = firstStatement(body)

  return hasOneStatement(body)
    ? statement.pipe(Option.flatMap(returnExpression))
    : Option.none()
}

const conciseArrowBody = (
  arrowFunction: ts.ArrowFunction
): Option.Option<ts.Expression> =>
  ts.isBlock(arrowFunction.body)
    ? Option.none()
    : Option.some(arrowFunction.body)

const propertyAccessorImplicitReturnExpression = (
  node: PropertyAccessorFunction
): Option.Option<ts.Expression> =>
  Option.liftPredicate(ts.isArrowFunction)(node).pipe(
    Option.flatMap(conciseArrowBody)
  )

const blockReturnExpression = (
  node: PropertyAccessorFunction
): Option.Option<ts.Expression> =>
  Option.fromNullable(node.body).pipe(
    Option.filter(ts.isBlock),
    Option.flatMap(singleReturnExpression)
  )

const implementedExpression = (
  node: PropertyAccessorFunction
): Option.Option<ts.Expression> => {
  const implicitExpression = propertyAccessorImplicitReturnExpression(node)
  const blockExpression = blockReturnExpression(node)

  return Option.firstSomeOf([implicitExpression, blockExpression])
}

const directPropertyAccessExpression = (
  expression: ts.Expression
): Option.Option<ts.PropertyAccessExpression> => {
  const unwrapped = unwrapTransparentExpression(expression)

  return Option.liftPredicate(ts.isPropertyAccessExpression)(unwrapped)
}

const identifierBindingNameText = (
  name: ts.BindingName
): Option.Option<string> =>
  Option.liftPredicate(ts.isIdentifier)(name).pipe(
    Option.map(Struct.get("text"))
  )

const identifierParameterName = (
  parameter: ts.ParameterDeclaration
): Option.Option<string> => identifierBindingNameText(parameter.name)

const hasSingleParameter = (node: PropertyAccessorFunction): boolean =>
  node.parameters.length === 1

const soleIdentifierParameterName = (
  node: PropertyAccessorFunction
): Option.Option<string> => {
  const parameter = Option.fromNullable(node.parameters[0])

  return hasSingleParameter(node)
    ? parameter.pipe(Option.flatMap(identifierParameterName))
    : Option.none()
}

const hasIdentifierText =
  (text: string) =>
  (identifier: ts.Identifier): boolean =>
    identifier.text === text

const propertyAccessBaseIdentifier = (
  access: ts.PropertyAccessExpression
): Option.Option<ts.Identifier> =>
  Option.liftPredicate(ts.isIdentifier)(access.expression)

const accessesParameterProperty =
  (parameterName: string) =>
  (access: ts.PropertyAccessExpression): boolean =>
    propertyAccessBaseIdentifier(access).pipe(
      Option.exists(hasIdentifierText(parameterName))
    )

const parameterPropertyAccess =
  (node: PropertyAccessorFunction) =>
  (parameterName: string): Option.Option<ts.PropertyAccessExpression> =>
    implementedExpression(node).pipe(
      Option.flatMap(directPropertyAccessExpression),
      Option.filter(accessesParameterProperty(parameterName))
    )

const propertyAccessorExpression = (
  node: PropertyAccessorFunction
): Option.Option<ts.PropertyAccessExpression> =>
  soleIdentifierParameterName(node).pipe(
    Option.flatMap(parameterPropertyAccess(node))
  )

const hasStringIndexSignature = (type: ts.Type): boolean => {
  const stringIndexType = type.getStringIndexType()
  const indexType = Option.fromNullable(stringIndexType)

  return Option.isSome(indexType)
}

const hasNumberIndexSignature = (type: ts.Type): boolean => {
  const numberIndexType = type.getNumberIndexType()
  const indexType = Option.fromNullable(numberIndexType)

  return Option.isSome(indexType)
}

const hasIndexSignature = (type: ts.Type): boolean =>
  [hasStringIndexSignature(type), hasNumberIndexSignature(type)].some(Boolean)

const isRecordTypeMember =
  (context: RuleContext) =>
  (type: ts.Type): boolean =>
    isRecordType(context, type)

const isRecordType = (context: RuleContext, type: ts.Type): boolean => {
  const apparentType = context.checker.getApparentType(type)

  return type.isUnionOrIntersection()
    ? type.types.every(isRecordTypeMember(context))
    : [hasIndexSignature(type), hasIndexSignature(apparentType)].some(Boolean)
}

const propertyKeyText = (access: ts.PropertyAccessExpression): string =>
  JSON.stringify(access.name.text)

const accessorModuleName = (
  context: RuleContext,
  access: ts.PropertyAccessExpression
): string => {
  const accessedType = context.checker.getTypeAtLocation(access.expression)

  return isRecordType(context, accessedType) ? "Record" : "Struct"
}

const accessorSuggestion = (
  context: RuleContext,
  access: ts.PropertyAccessExpression
): string => {
  const moduleName = accessorModuleName(context, access)
  const propertyKey = propertyKeyText(access)

  return `${moduleName}.get(${propertyKey})`
}

const declarationNameText =
  (context: RuleContext) =>
  (name: ts.PropertyName): string =>
    name.getText(context.sourceFile)

const variableDeclarationName =
  (node: PropertyAccessorFunction) => (): Option.Option<string> =>
    Option.liftPredicate(ts.isVariableDeclaration)(node.parent).pipe(
      Option.map(Struct.get("name")),
      Option.flatMap(identifierBindingNameText)
    )

const functionName = (
  node: PropertyAccessorFunction,
  context: RuleContext
): string =>
  Option.fromNullable(node.name).pipe(
    Option.map(declarationNameText(context)),
    Option.orElse(variableDeclarationName(node)),
    Option.getOrElse(Function.constant("this function"))
  )

const propertyAccessorRuleMatch =
  (context: RuleContext, node: PropertyAccessorFunction) =>
  (access: ts.PropertyAccessExpression): RuleMatch => {
    const name = functionName(node, context)
    const accessedText = access.getText(context.sourceFile)
    const suggestion = accessorSuggestion(context, access)

    return createRuleMatch(context, {
      ruleId,
      node: access,
      message: `Avoid defining ${name} only to read ${accessedText}.`,
      hint:
        `Replace this property-access-only function with ${suggestion} from Effect. ` +
        "Use Struct.get for non-record data types, and Record.get or Record.has for records."
    })
  }

const propertyAccessorMatches = (
  node: PropertyAccessorFunction,
  context: RuleContext
): ReadonlyArray<RuleMatch> =>
  propertyAccessorExpression(node).pipe(
    Option.map(propertyAccessorRuleMatch(context, node)),
    Option.toArray
  )

const check = onNode(
  propertyAccessorFunctionKinds,
  isPropertyAccessorFunction,
  propertyAccessorMatches
)

const badExample = new ExampleSnippet({
  filePath: "src/users.ts",
  code: `const getName = (user: User): string =>
  user.name`
})

const goodExample = new ExampleSnippet({
  filePath: "src/users.ts",
  code: `const getName = Struct.get("name")`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const preferEffectPropertyAccessors = new Rule({
  id: ruleId,
  description:
    "Prefer Effect Struct (`Struct.get`) and Record (`Record.has` -> `Record.get`) accessors over property-access-only functions.",
  example,
  check
})
