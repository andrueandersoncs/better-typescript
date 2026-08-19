import {
  Array,
  Match as EffectMatch,
  Function,
  Match,
  Option,
  Predicate,
  Struct,
  flow,
  pipe
} from "effect"
import * as ts from "typescript"
import { strictEqual } from "../../equivalence.js"
import { fixedRuleMessage } from "../../rule/fixedRuleMessage.js"
import { makeRule } from "../../rule/makeRule.js"
import { acceptsNode } from "../../scanner/acceptsNode.js"
import { makeNodeScanner } from "../../scanner/makeNodeScanner.js"
import type { Match as ScannerMatch } from "../../scanner/match.js"
import type { MatchContext } from "../../scanner/matchContext.js"
import { foldAst } from "../../sources/foldAst.js"
import { classDeclarationName } from "../../support/classDeclarationName.js"
import { classExtendsEffectApi } from "../../support/effectApi/classExtendsEffectApi.js"
import { enclosingFunctionLike } from "../../support/effectApi/enclosingFunctionLike.js"
import { importedEffectApiAt } from "../../support/effectApi/importedEffectApiAt.js"
import { importedMemberAt } from "../../support/effectApi/importedMemberAt.js"
import { importedMemberSubject } from "../../support/effectApi/importedMemberSubject.js"
import { propertyNameText } from "../../support/propertyNameText.js"
import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"
import { unwrapCallee } from "../../support/unwrapCallee.js"
import { variableDeclarationNameIsIdentifier } from "../../support/variableDeclarationNameIsIdentifier.js"
import { callIsEffectApi } from "./callIsEffectApi.js"
import { callIsResponseJson, schemaDecodeNames } from "./responseJson.js"
import { makeSubjectMatch, noSubjectMatches } from "./subjectMatch.js"

const emptyHeritageClauses: ReadonlyArray<ts.HeritageClause> = Array.empty()

const heritageClauseIsExtends = flow(
  Struct.get<ts.HeritageClause, "token">("token"),
  strictEqual(ts.SyntaxKind.ExtendsKeyword)
)

const parenthesizedTypeIncludesUndefined = (parenthesized: ts.ParenthesizedTypeNode) =>
  typeNodeIncludesUndefined(parenthesized.type)

const unionTypeIncludesUndefined = (union: ts.UnionTypeNode) =>
  Array.some(union.types, typeNodeIncludesUndefined)

const typeNodeIncludesUndefined = (typeNode: ts.TypeNode): boolean => {
  const isUndefinedKeyword = strictEqual(ts.SyntaxKind.UndefinedKeyword)(typeNode.kind)

  const nestedIncludes = pipe(
    Match.value(typeNode),
    Match.when(ts.isParenthesizedTypeNode, parenthesizedTypeIncludesUndefined),
    Match.when(ts.isUnionTypeNode, unionTypeIncludesUndefined),
    Match.orElse(Function.constFalse)
  )

  const checks = Array.make(isUndefinedKeyword, nestedIncludes)

  return Array.some(checks, Boolean)
}

const propertyNameTextFromNode = (name: ts.Node) =>
  ts.isPropertyName(name) ? propertyNameText(name) : Option.none()

const propertySignatureNameMatches = (fieldName: string) => (member: ts.PropertySignature) =>
  pipe(
    Option.fromNullishOr(member.name),
    Option.flatMap(propertyNameTextFromNode),
    Option.exists(strictEqual(fieldName))
  )

const propertySignatureIsUndefinedFreeOptional = (fieldName: string) => (member: ts.TypeElement) =>
  pipe(
    Option.liftPredicate(ts.isPropertySignature)(member),
    Option.exists((signature) => {
      const nameMatches = propertySignatureNameMatches(fieldName)(signature)
      const questionToken = Option.fromNullishOr(signature.questionToken)
      const isOptional = Option.isSome(questionToken)
      const typeNode = Option.fromNullishOr(signature.type)

      const undefinedFree = pipe(
        typeNode,
        Option.match({
          onNone: Function.constTrue,
          onSome: Predicate.not(typeNodeIncludesUndefined)
        })
      )

      const checks = Array.make(nameMatches, isOptional, undefinedFree)

      return Array.every(checks, Boolean)
    })
  )

const schemaClassModelNames = Array.make("Class", "TaggedClass")

const classExtendsSchemaModel = (checker: ts.TypeChecker) => (declaration: ts.ClassDeclaration) => {
  const extendsSchemaMember = Function.flip(classExtendsEffectApi(checker)("Schema"))(declaration)

  return Array.some(schemaClassModelNames, extendsSchemaMember)
}

const classQualityFromNode = (context: MatchContext) => (node: ts.Node) =>
  pipe(
    Option.liftPredicate(ts.isClassDeclaration)(node),
    Option.filter(classExtendsSchemaModel(context.checker)),
    Option.map((declaration) => {
      const nameOption = Option.fromNullishOr(declaration.name)

      const subject = pipe(
        nameOption,
        Option.map(Struct.get("text")),
        Option.getOrElse(Function.constant("Schema.Class"))
      )

      const targetNode = pipe(
        nameOption,
        Option.map((name): ts.Node => name),
        Option.getOrElse(Function.constant(declaration))
      )

      return makeSubjectMatch(subject)(targetNode)
    })
  )

const schemaClassCallArgumentShape = (argument: ts.Expression) => {
  const current = unwrapTransparentExpression(argument)
  const isFields = ts.isObjectLiteralExpression(current)
  const isIdentifier = ts.isIdentifier(current)
  const isCall = ts.isCallExpression(current)
  const structCandidates = Array.make(isIdentifier, isCall)
  const isStructSchema = Array.some(structCandidates, Boolean)
  const checks = Array.make(isFields, isStructSchema)

  return Array.some(checks, Boolean)
}

const callIsSchemaClassModel = (checker: ts.TypeChecker) => {
  const isSchemaClassModel = importedEffectApiAt(checker)("Schema")(schemaClassModelNames)

  return flow(
    Struct.get<ts.CallExpression, "expression">("expression"),
    unwrapCallee,
    isSchemaClassModel
  )
}

const callHasSchemaClassArgumentShape = (call: ts.CallExpression) =>
  pipe(Array.head(call.arguments), Option.exists(schemaClassCallArgumentShape))

const callQualityFromNode = (context: MatchContext) => (node: ts.Node) =>
  pipe(
    Option.liftPredicate(ts.isCallExpression)(node),
    Option.filter(callIsSchemaClassModel(context.checker)),
    Option.filter(callHasSchemaClassArgumentShape),
    Option.map((call) => {
      const callee = unwrapCallee(call.expression)
      const member = importedMemberAt(context.checker)(callee)
      const callText = call.expression.getText(context.sourceFile)
      const fallbackText = Function.constant(callText)

      const subject = pipe(
        member,
        Option.map(importedMemberSubject),
        Option.getOrElse(fallbackText)
      )

      return makeSubjectMatch(subject)(call.expression)
    })
  )

const schemaClassModelFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> => {
    const fromClass = classQualityFromNode(context)(node)
    const fromCall = callQualityFromNode(context)(node)
    const candidates = Array.make(fromClass, fromCall)

    return pipe(candidates, Array.flatMap(Option.toArray))
  }

const emptyTypeNodes: ReadonlyArray<ts.TypeNode> = Array.empty()

const schemaStructNames = Array.of("Struct")

const schemaOptionalNames = Array.of("optional")

const identifierTextEquals = (schemaName: string) => (expression: ts.EntityName) =>
  pipe(
    Option.liftPredicate(ts.isIdentifier)(expression),
    Option.map(Struct.get("text")),
    Option.contains(schemaName)
  )

const typeQueryTargetsName = (schemaName: string) => (typeNode: ts.TypeNode) =>
  pipe(
    Option.liftPredicate(ts.isTypeQueryNode)(typeNode),
    Option.map(Struct.get("exprName")),
    Option.exists(identifierTextEquals(schemaName))
  )

const heritageExtendsSchemaDecodedType =
  (schemaName: string) => (heritage: ts.ExpressionWithTypeArguments) => {
    const expressionText = heritage.expression.getText()
    const isBareType = strictEqual("Type")(expressionText)
    const isQualifiedType = expressionText.endsWith(".Type")
    const typeReferenceCandidates = Array.make(isBareType, isQualifiedType)
    const referencesType = Array.some(typeReferenceCandidates, Boolean)
    const typeArguments = heritage.typeArguments ?? emptyTypeNodes

    const targetsSchema = pipe(
      Array.head(typeArguments),
      Option.exists(typeQueryTargetsName(schemaName))
    )

    const checks = Array.make(referencesType, targetsSchema)

    return Array.every(checks, Boolean)
  }

const heritageClausePairsWithSchema =
  (extendsSchema: (heritage: ts.ExpressionWithTypeArguments) => boolean) =>
  (clause: ts.HeritageClause) => {
    const isExtends = heritageClauseIsExtends(clause)
    const typeMatches = Array.some(clause.types, extendsSchema)
    const checks = Array.make(isExtends, typeMatches)

    return Array.every(checks, Boolean)
  }

const interfacePairsWithSchema = (schemaName: string) => (declaration: ts.InterfaceDeclaration) => {
  const nameMatches = strictEqual(schemaName)(declaration.name.text)
  const clauses = declaration.heritageClauses ?? emptyHeritageClauses
  const extendsSchema = heritageExtendsSchemaDecodedType(schemaName)
  const heritageMatches = Array.some(clauses, heritageClausePairsWithSchema(extendsSchema))
  const checks = Array.make(nameMatches, heritageMatches)

  return Array.every(checks, Boolean)
}

const statementIsSchemaRecordInterface = (schemaName: string) => (statement: ts.Statement) =>
  pipe(
    Option.liftPredicate(ts.isInterfaceDeclaration)(statement),
    Option.exists(interfacePairsWithSchema(schemaName))
  )

const sourceFileHasSchemaRecordInterface = (schemaName: string) => (sourceFile: ts.SourceFile) =>
  Array.some(sourceFile.statements, statementIsSchemaRecordInterface(schemaName))

const callIsSchemaStruct = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  importedEffectApiAt(checker)("Schema")(schemaStructNames)(call.expression)

const isSchemaStructCall = (checker: ts.TypeChecker) => (expression: ts.Expression) =>
  pipe(
    expression,
    unwrapTransparentExpression,
    Option.liftPredicate(ts.isCallExpression),
    Option.exists(callIsSchemaStruct(checker))
  )

const declarationHasSchemaStructInitializer =
  (checker: ts.TypeChecker) => (declaration: ts.VariableDeclaration) =>
    pipe(Option.fromNullishOr(declaration.initializer), Option.exists(isSchemaStructCall(checker)))

const declarationLacksSchemaRecordInterface =
  (sourceFile: ts.SourceFile) => (declaration: ts.VariableDeclaration) => {
    const hasInterface = sourceFileHasSchemaRecordInterface(
      (declaration.name as ts.Identifier).text
    )(sourceFile)

    return !hasInterface
  }

const schemaRecordInterfaceFindingFromDeclaration = flow(
  Struct.get<ts.VariableDeclaration, "name">("name"),
  makeSubjectMatch("Schema.Struct")
)

const schemaRecordInterfaceFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> =>
    pipe(
      Option.liftPredicate(ts.isVariableDeclaration)(node),
      Option.filter(variableDeclarationNameIsIdentifier),
      Option.filter(declarationHasSchemaStructInitializer(context.checker)),
      Option.filter(declarationLacksSchemaRecordInterface(context.sourceFile)),
      Option.map(schemaRecordInterfaceFindingFromDeclaration),
      Option.toArray
    )

const typeLiteralHasUndefinedFreeOptionalField =
  (fieldName: string) => (typeLiteral: ts.TypeLiteralNode) =>
    Array.some(typeLiteral.members, propertySignatureIsUndefinedFreeOptional(fieldName))

const interfaceHasUndefinedFreeOptionalField =
  (fieldName: string) => (declaration: ts.InterfaceDeclaration) =>
    Array.some(declaration.members, propertySignatureIsUndefinedFreeOptional(fieldName))

const typeAliasHasUndefinedFreeOptionalField = (fieldName: string) => (statement: ts.Statement) =>
  pipe(
    Option.liftPredicate(ts.isTypeAliasDeclaration)(statement),
    Option.map(Struct.get("type")),
    Option.filter(ts.isTypeLiteralNode),
    Option.exists(typeLiteralHasUndefinedFreeOptionalField(fieldName))
  )

const statementProvesUndefinedFreeOptionalField =
  (fieldName: string) => (statement: ts.Statement) => {
    const fromInterface = pipe(
      Option.liftPredicate(ts.isInterfaceDeclaration)(statement),
      Option.exists(interfaceHasUndefinedFreeOptionalField(fieldName))
    )

    const fromTypeAlias = typeAliasHasUndefinedFreeOptionalField(fieldName)(statement)
    const checks = Array.make(fromInterface, fromTypeAlias)

    return Array.some(checks, Boolean)
  }

const sourceFileProvesUndefinedFreeOptionalField =
  (fieldName: string) => (sourceFile: ts.SourceFile) =>
    Array.some(sourceFile.statements, statementProvesUndefinedFreeOptionalField(fieldName))

const callIsSchemaOptional = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  importedEffectApiAt(checker)("Schema")(schemaOptionalNames)(call.expression)

const schemaOptionalKeyMatchForField = (fieldName: string) =>
  flow(Struct.get<ts.CallExpression, "expression">("expression"), makeSubjectMatch(fieldName))

const optionalKeyFindingForField =
  (context: MatchContext) => (assignment: ts.PropertyAssignment) => (fieldName: string) =>
    pipe(
      assignment.initializer,
      unwrapTransparentExpression,
      Option.liftPredicate(ts.isCallExpression),
      Option.filter(callIsSchemaOptional(context.checker)),
      Option.filter(() =>
        sourceFileProvesUndefinedFreeOptionalField(fieldName)(context.sourceFile)
      ),
      Option.map(schemaOptionalKeyMatchForField(fieldName))
    )

const optionalKeyFindingFromAssignment =
  (context: MatchContext) => (assignment: ts.PropertyAssignment) =>
    pipe(
      propertyNameText(assignment.name),
      Option.flatMap(optionalKeyFindingForField(context)(assignment))
    )

const schemaOptionalKeyFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> =>
    pipe(
      Option.liftPredicate(ts.isPropertyAssignment)(node),
      Option.flatMap(optionalKeyFindingFromAssignment(context)),
      Option.toArray
    )

const schemaTaggedErrorNames = Array.make("TaggedErrorClass", "ErrorClass", "TaggedError")

const dataTaggedErrorNames = Array.make("TaggedError", "Error")

const errorNamePattern = /Error$|Failure$|Exception$/u

const propertyNameIsTag = strictEqual("_tag")

const propertyDeclarationIsTag = (property: ts.PropertyDeclaration) =>
  pipe(propertyNameText(property.name), Option.exists(propertyNameIsTag))

const classMemberIsTag = (member: ts.ClassElement) =>
  pipe(
    Option.liftPredicate(ts.isPropertyDeclaration)(member),
    Option.exists(propertyDeclarationIsTag)
  )

const classHasTagMember = (declaration: ts.ClassDeclaration) =>
  Array.some(declaration.members, classMemberIsTag)

const nameMatchesErrorPattern = (name: string) => errorNamePattern.test(name)

const classNameLooksLikeError = (declaration: ts.ClassDeclaration) =>
  pipe(
    Option.fromNullishOr(declaration.name),
    Option.map(Struct.get("text")),
    Option.exists(nameMatchesErrorPattern)
  )

const identifierIsError = flow(Struct.get<ts.Identifier, "text">("text"), strictEqual("Error"))

const propertyAccessIsError = (access: ts.PropertyAccessExpression) =>
  strictEqual("Error")(access.name.text)

const nodeIsErrorConstructor = (current: ts.Expression) =>
  pipe(
    EffectMatch.value(current),
    EffectMatch.when(ts.isIdentifier, identifierIsError),
    EffectMatch.when(ts.isPropertyAccessExpression, propertyAccessIsError),
    EffectMatch.orElse(Function.constFalse)
  )

const heritageExpressionIsErrorConstructor = flow(
  unwrapTransparentExpression,
  unwrapCallee,
  nodeIsErrorConstructor
)

const heritageTypeIsErrorConstructor = (heritage: ts.ExpressionWithTypeArguments) =>
  heritageExpressionIsErrorConstructor(heritage.expression)

const classExtendsBuiltinError = (declaration: ts.ClassDeclaration) => {
  const clauses = declaration.heritageClauses ?? emptyHeritageClauses

  return Array.some(clauses, (clause) => {
    const isExtends = heritageClauseIsExtends(clause)
    const extendsError = Array.some(clause.types, heritageTypeIsErrorConstructor)
    const checks = Array.make(isExtends, extendsError)

    return Array.every(checks, Boolean)
  })
}

const classExtendsDataTaggedError =
  (checker: ts.TypeChecker) => (declaration: ts.ClassDeclaration) => {
    const clauses = declaration.heritageClauses ?? emptyHeritageClauses

    return Array.some(clauses, (clause) => {
      const isExtends = heritageClauseIsExtends(clause)
      const isDataTaggedError = importedEffectApiAt(checker)("Data")(dataTaggedErrorNames)

      const heritageExtendsDataTagged = flow(
        Struct.get<ts.ExpressionWithTypeArguments, "expression">("expression"),
        unwrapCallee,
        isDataTaggedError
      )

      const extendsDataTagged = Array.some(clause.types, heritageExtendsDataTagged)
      const checks = Array.make(isExtends, extendsDataTagged)

      return Array.every(checks, Boolean)
    })
  }

const classAlreadySchemaTaggedError =
  (checker: ts.TypeChecker) => (declaration: ts.ClassDeclaration) => {
    const extendsSchemaMember = Function.flip(classExtendsEffectApi(checker)("Schema"))(declaration)

    return Array.some(schemaTaggedErrorNames, extendsSchemaMember)
  }

const classLooksLikeHandRolledError =
  (checker: ts.TypeChecker) => (declaration: ts.ClassDeclaration) => {
    const tagged = classHasTagMember(declaration)
    const dataTagged = classExtendsDataTaggedError(checker)(declaration)
    const errorHeritage = classExtendsBuiltinError(declaration)
    const errorName = classNameLooksLikeError(declaration)
    const errorLikeCandidates = Array.make(errorHeritage, errorName, dataTagged)
    const errorLike = Array.some(errorLikeCandidates, Boolean)
    const handRolledCandidates = Array.make(tagged, dataTagged)
    const handRolled = Array.some(handRolledCandidates, Boolean)
    const checks = Array.make(handRolled, errorLike)

    return Array.every(checks, Boolean)
  }

const classDeclarationHasName = flow(classDeclarationName, Option.isSome)

const schemaErrorClassFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> =>
    pipe(
      Option.liftPredicate(ts.isClassDeclaration)(node),
      Option.filter(classDeclarationHasName),
      Option.filter(Predicate.not(classAlreadySchemaTaggedError(context.checker))),
      Option.filter(classLooksLikeHandRolledError(context.checker)),
      Option.map((declaration) => {
        const nameOption = Option.fromNullishOr(declaration.name)

        const targetNode = pipe(
          nameOption,
          Option.map((name): ts.Node => name),
          Option.getOrElse(Function.constant(declaration))
        )

        const subject = pipe(
          nameOption,
          Option.map(Struct.get("text")),
          Option.getOrElse(Function.constant("Error"))
        )

        return makeSubjectMatch(subject)(targetNode)
      }),
      Option.toArray
    )

const callIsJsonParse = (node: ts.CallExpression) => {
  const expression = unwrapTransparentExpression(node.expression)
  const isPropertyAccess = ts.isPropertyAccessExpression(expression)

  if (!isPropertyAccess) {
    return isPropertyAccess
  }

  const isParse = strictEqual("parse")(expression.name.text)
  const receiver = unwrapTransparentExpression(expression.expression)
  const isIdentifier = ts.isIdentifier(receiver)
  const receiverText = isIdentifier ? receiver.text : ""
  const isJsonName = strictEqual("JSON")(receiverText)
  const jsonParts = Array.make(isIdentifier, isJsonName)
  const jsonReceiver = Array.every(jsonParts, Boolean)
  const checks = Array.make(isParse, jsonReceiver)

  return Array.every(checks, Boolean)
}

const requestJsonAccess = (expression: ts.Expression) => {
  const access = unwrapTransparentExpression(expression)
  const isPropertyAccess = ts.isPropertyAccessExpression(access)

  if (!isPropertyAccess) {
    return isPropertyAccess
  }

  const receiver = access.expression.getText()
  const isJsonMethod = strictEqual("json")(access.name.text)
  const looksLikeRequest = /request|req|body|payload|event/i.test(receiver)
  const checks = Array.make(isJsonMethod, looksLikeRequest)

  return Array.every(checks, Boolean)
}

const parentDecodesNode = (checker: ts.TypeChecker) => (parent: ts.Node) => {
  if (ts.isCallExpression(parent)) {
    return callIsEffectApi(checker)("Schema")(schemaDecodeNames)(parent)
  }

  const grandparentCall = ts.isCallExpression(parent.parent)

  return grandparentCall
    ? callIsEffectApi(checker)("Schema")(schemaDecodeNames)(parent.parent)
    : grandparentCall
}

const boundarySchemaDecodeCandidates =
  (context: MatchContext) =>
  (node: ts.CallExpression): ReadonlyArray<ScannerMatch<string>> => {
    const responseJson = callIsResponseJson(node)

    if (responseJson) {
      return noSubjectMatches
    }

    const jsonParse = callIsJsonParse(node)
    // request.json is boundary-shaped because it is not the HTTP response rule.
    const requestJson = requestJsonAccess(node.expression)
    const candidates = Array.make(jsonParse, requestJson)

    if (!Array.some(candidates, Boolean)) {
      return noSubjectMatches
    }

    // Quiet when decode is composed directly around this node because Schema already validates.
    const parentDecodes = pipe(
      Option.fromNullishOr(node.parent),
      Option.exists(parentDecodesNode(context.checker))
    )

    const nearbyDecodeStep = (found: boolean) => (current: ts.Node) => {
      const isCall = ts.isCallExpression(current)

      const isDecodeCall =
        isCall && callIsEffectApi(context.checker)("Schema")(schemaDecodeNames)(current)

      const signals = Array.make(found, isDecodeCall)

      return Array.some(signals, Boolean)
    }

    const uncurriedStep = Function.untupled(([found, current]: readonly [boolean, ts.Node]) =>
      nearbyDecodeStep(found)(current)
    )

    const scan = Function.flip(foldAst(uncurriedStep))(false)
    const nearbyDecode = pipe(enclosingFunctionLike(node), Option.exists(scan))
    const alreadyDecoded = Array.make(parentDecodes, nearbyDecode)

    if (Array.some(alreadyDecoded, Boolean)) {
      return noSubjectMatches
    }

    const subject = jsonParse ? "JSON.parse" : node.expression.getText()
    const finding = makeSubjectMatch(subject)(node.expression)

    return Array.of(finding)
  }

const schemaKinds = Array.make(
  ts.SyntaxKind.AsExpression,
  ts.SyntaxKind.TypeAssertionExpression,
  ts.SyntaxKind.CallExpression,
  ts.SyntaxKind.ModuleDeclaration,
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.VariableDeclaration,
  ts.SyntaxKind.PropertyAssignment,
  ts.SyntaxKind.FunctionDeclaration
)

const callKinds = Array.of(ts.SyntaxKind.CallExpression)

const schemaClassModelsScanner = makeNodeScanner(schemaKinds)(acceptsNode)(schemaClassModelFindings)

export const schemaClassModels = makeRule("schema-class-models")(schemaClassModelsScanner)(
  fixedRuleMessage(
    "Avoid Schema class data models; use Schema.Struct or tagged schema variants.",
    "Keep ordinary data declarative and decode it at the boundary."
  )
)

const schemaRecordInterfaceScanner = makeNodeScanner(schemaKinds)(acceptsNode)(
  schemaRecordInterfaceFindings
)

export const schemaRecordInterface = makeRule("schema-record-interface")(
  schemaRecordInterfaceScanner
)(
  fixedRuleMessage(
    "Pair a Schema.Struct record with its same-name interface.",
    "Export the decoded interface beside the Schema.Struct declaration."
  )
)

const schemaOptionalKeyScanner =
  makeNodeScanner(schemaKinds)(acceptsNode)(schemaOptionalKeyFindings)

export const schemaOptionalKey = makeRule("schema-optional-key")(schemaOptionalKeyScanner)(
  fixedRuleMessage(
    "Use Schema.optionalKey for absent fields unless undefined is contractual.",
    "Use optionalKey for absent JSON keys; reserve optional for explicit undefined."
  )
)

const schemaErrorClassScanner = makeNodeScanner(schemaKinds)(acceptsNode)(schemaErrorClassFindings)

export const schemaErrorClass = makeRule("schema-error-class")(schemaErrorClassScanner)(
  fixedRuleMessage(
    "Use Schema.TaggedErrorClass for typed Effect errors.",
    "Map boundary failures into a tagged schema error with useful operation context."
  )
)

const boundarySchemaDecodeScanner = makeNodeScanner(callKinds)(ts.isCallExpression)(
  boundarySchemaDecodeCandidates
)

export const boundarySchemaDecode = makeRule("boundary-schema-decode")(boundarySchemaDecodeScanner)(
  fixedRuleMessage(
    "Decode unknown boundary data.",
    "Use Schema.decodeUnknownEffect or a boundary-specific decoder before consuming the value."
  )
)
