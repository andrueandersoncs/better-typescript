import { Function, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { conciseArrowBody, unwrapTransparentExpression } from "./tsNode.js"
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

const singleReturnExpression = (
  body: ts.Block
): Option.Option<ts.Expression> => {
  const hasSingleStatement = body.statements.length === 1
  const statement = hasSingleStatement
    ? Option.fromNullable(body.statements[0])
    : Option.none<ts.Statement>()

  return pipe(statement, Option.flatMap(returnExpression))
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
  pipe(
    Option.liftPredicate(ts.isIdentifier)(name),
    Option.map(Struct.get("text"))
  )

const identifierParameterName = (
  parameter: ts.ParameterDeclaration
): Option.Option<string> => identifierBindingNameText(parameter.name)

const hasIdentifierText =
  (text: string) =>
  (identifier: ts.Identifier): boolean =>
    identifier.text === text

const accessesParameterProperty =
  (parameterName: string) =>
  (access: ts.PropertyAccessExpression): boolean =>
    pipe(
      Option.liftPredicate(ts.isIdentifier)(access.expression),
      Option.exists(hasIdentifierText(parameterName))
    )

const parameterPropertyAccess =
  (node: PropertyAccessorFunction) =>
  (parameterName: string): Option.Option<ts.PropertyAccessExpression> => {
    const implicitExpression = pipe(
      Option.liftPredicate(ts.isArrowFunction)(node),
      Option.flatMap(conciseArrowBody)
    )
    const blockExpression = pipe(
      Option.fromNullable(node.body),
      Option.filter(ts.isBlock),
      Option.flatMap(singleReturnExpression)
    )

    return pipe(
      Option.firstSomeOf([implicitExpression, blockExpression]),
      Option.flatMap(directPropertyAccessExpression),
      Option.filter(accessesParameterProperty(parameterName))
    )
  }

const hasIndexSignature = (type: ts.Type): boolean => {
  const stringIndex = type.getStringIndexType()
  const stringIndexType = Option.fromNullable(stringIndex)
  const hasStringIndex = Option.isSome(stringIndexType)
  const numberIndex = type.getNumberIndexType()
  const numberIndexType = Option.fromNullable(numberIndex)
  const hasNumberIndex = Option.isSome(numberIndexType)

  return hasStringIndex || hasNumberIndex
}

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

const declarationNameText =
  (context: RuleContext) =>
  (name: ts.PropertyName): string =>
    name.getText(context.sourceFile)

const variableDeclarationName =
  (node: PropertyAccessorFunction) => (): Option.Option<string> =>
    pipe(
      Option.liftPredicate(ts.isVariableDeclaration)(node.parent),
      Option.map(Struct.get("name")),
      Option.flatMap(identifierBindingNameText)
    )

const propertyAccessorRuleMatch =
  (context: RuleContext, node: PropertyAccessorFunction) =>
  (access: ts.PropertyAccessExpression): RuleMatch => {
    const name = pipe(
      Option.fromNullable(node.name),
      Option.map(declarationNameText(context)),
      Option.orElse(variableDeclarationName(node)),
      Option.getOrElse(Function.constant("this function"))
    )
    const accessedText = access.getText(context.sourceFile)
    const accessedType = context.checker.getTypeAtLocation(access.expression)
    const moduleName = isRecordType(context, accessedType) ? "Record" : "Struct"
    const propertyKey = JSON.stringify(access.name.text)
    const suggestion = `${moduleName}.get(${propertyKey})`

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
): ReadonlyArray<RuleMatch> => {
  const hasSingleParam = node.parameters.length === 1
  const singleParam = hasSingleParam
    ? Option.fromNullable(node.parameters[0])
    : Option.none<ts.ParameterDeclaration>()
  const paramName = pipe(singleParam, Option.flatMap(identifierParameterName))

  return pipe(
    paramName,
    Option.flatMap(parameterPropertyAccess(node)),
    Option.map(propertyAccessorRuleMatch(context, node)),
    Option.toArray
  )
}

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
