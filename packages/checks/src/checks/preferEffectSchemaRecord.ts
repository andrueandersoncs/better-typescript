import { Array, Function, HashMap, Match, Option, pipe, Result, Struct, Tuple } from "effect"
import * as ts from "typescript"
import { outermostTransparentWrapper } from "./support/tsNode.js"
import { isObjectType } from "./support/tsType.js"
import { foldAst, isProjectSourceFile, type AstFold } from "@better-typescript/core/engine/sources"
import { makePlannedCheck } from "../defineCheck.js"
import type { CheckContext, Subscription } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"

import { toRelativeFileName } from "@better-typescript/core/engine/location"
import { nodeSubscriptions, makeDetection } from "@better-typescript/core/engine/check"

import { type ReferenceKey, referenceKey } from "./support/referenceKey.js"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

const schemaPropertyNameText = (name: ts.PropertyName) =>
  pipe(Option.liftPredicate(ts.isIdentifier)(name), Option.map(Struct.get("text")))

const namedPropertyText = (property: ts.ObjectLiteralElementLike) =>
  pipe(Option.fromNullishOr(property.name), Option.flatMap(schemaPropertyNameText))

const isProjectObjectTypeDeclaration = (declaration: ts.Declaration) => {
  const sourceFile = declaration.getSourceFile()
  const isInterfaceDeclaration = ts.isInterfaceDeclaration(declaration)
  const isTypeAliasDeclaration = ts.isTypeAliasDeclaration(declaration)
  const isTypeLiteralAlias = isTypeAliasDeclaration && ts.isTypeLiteralNode(declaration.type)
  const conditions = Array.make(isInterfaceDeclaration, isTypeLiteralAlias)
  const isRelevantDeclaration = Array.some(conditions, Boolean)

  return isProjectSourceFile(sourceFile) && isRelevantDeclaration
}

const isProjectObjectTypeSymbol = (symbol: ts.Symbol) => {
  const declarations = symbol.declarations ?? Array.empty()

  return Array.some(declarations, isProjectObjectTypeDeclaration)
}

const typeObjectTypeSymbol = (type: ts.Type) => {
  const symbol = type.getSymbol()
  const directSymbol = pipe(Option.fromNullishOr(symbol), Option.filter(isProjectObjectTypeSymbol))

  const aliasSymbol = pipe(
    Option.fromNullishOr(type.aliasSymbol),
    Option.filter(isProjectObjectTypeSymbol)
  )

  const fallbackAlias = Function.constant(aliasSymbol)

  return Option.orElse(directSymbol, fallbackAlias)
}

const hasReferenceObjectFlag = (type: ts.ObjectType) =>
  (type.objectFlags & ts.ObjectFlags.Reference) !== 0

const isTypeReference = (type: ts.Type): type is ts.TypeReference => {
  const objectType = Option.liftPredicate(isObjectType)(type)

  return Option.exists(objectType, hasReferenceObjectFlag)
}

const typeMembers = (type: ts.Type): ReadonlyArray<ts.Type> =>
  type.isUnion() ? type.types : Array.of(type)

const isSignatureTypeParameter = (type: ts.Type) => type.isTypeParameter()

const addObjectLiteral: AstFold<ReadonlyArray<ts.ObjectLiteralExpression>> = (literals, node) =>
  ts.isObjectLiteralExpression(node) ? Array.append(literals, node) : literals

const addConstructionEntry = (
  index: HashMap.HashMap<ReferenceKey<ts.Symbol>, string>,
  entry: readonly [ReferenceKey<ts.Symbol>, string]
): HashMap.HashMap<ReferenceKey<ts.Symbol>, string> => {
  const symbolKey = Tuple.get(entry, 0)
  const constructionPath = Tuple.get(entry, 1)

  return HashMap.has(index, symbolKey) ? index : HashMap.set(index, symbolKey, constructionPath)
}

const buildConstructionIndex = (
  context: ProgramContext
): HashMap.HashMap<ReferenceKey<ts.Symbol>, string> => {
  const emptyIndex = HashMap.empty<ReferenceKey<ts.Symbol>, string>()
  const checker = context.checker

  const typeHasProperty = (type: ts.Type) => (name: string) => {
    const declaredProperty = type.getProperty(name)
    const property = Option.fromNullishOr(declaredProperty)

    return Option.isSome(property)
  }

  const matchesLiteralShape = (literal: ts.ObjectLiteralExpression) => (type: ts.Type) => {
    const propertyNames = Array.filterMap(
      literal.properties,
      Function.flow(namedPropertyText, Result.fromOption(Function.constVoid))
    )

    return Array.every(propertyNames, typeHasProperty(type))
  }

  const candidateTypes =
    (literal: ts.ObjectLiteralExpression) =>
    (contextualType: ts.Type): ReadonlyArray<ts.Type> =>
      contextualType.isUnion()
        ? Array.filter(contextualType.types, matchesLiteralShape(literal))
        : Array.of(contextualType)

  const hasTypeReferenceTarget = (target: ts.GenericType) => (reference: ts.TypeReference) =>
    strictEqual(reference.target, target)

  const sameTypeReferenceTarget =
    (declaredMember: ts.TypeReference) =>
    (contextualMember: ts.Type): contextualMember is ts.TypeReference => {
      const reference = Option.liftPredicate(isTypeReference)(contextualMember)

      return Option.exists(reference, hasTypeReferenceTarget(declaredMember.target))
    }

  const typeArgumentAt = (parameterPosition: number) => (reference: ts.TypeReference) => {
    const typeArguments = checker.getTypeArguments(reference)

    return Array.get(typeArguments, parameterPosition)
  }

  const referenceTypeArgument =
    (typeParameter: ts.Type) =>
    (contextualMembers: ReadonlyArray<ts.Type>) =>
    (declaredMember: ts.TypeReference): ReadonlyArray<ts.Type> => {
      const typeArguments = checker.getTypeArguments(declaredMember)
      const isTypeParameter = (candidate: ts.Type) => strictEqual(candidate, typeParameter)

      const parameterPosition = pipe(
        Array.findFirstIndex(typeArguments, isTypeParameter),
        Option.getOrElse(() => -1)
      )

      if (parameterPosition < 0) {
        return Array.empty()
      }

      const matchingMembers = Array.filter(
        contextualMembers,
        sameTypeReferenceTarget(declaredMember)
      )

      return Array.filterMap(
        matchingMembers,
        Function.flow(typeArgumentAt(parameterPosition), Result.fromOption(Function.constVoid))
      )
    }

  const memberExtractions =
    (typeParameter: ts.Type) =>
    (contextualMembers: ReadonlyArray<ts.Type>) =>
    (declaredMember: ts.Type): ReadonlyArray<ts.Type> => {
      if (strictEqual(declaredMember, typeParameter)) {
        return contextualMembers
      }

      const emptyNodes = Array.empty()

      return pipe(
        Option.liftPredicate(isTypeReference)(declaredMember),
        Option.map(referenceTypeArgument(typeParameter)(contextualMembers)),
        Option.getOrElse(Function.constant(emptyNodes))
      )
    }

  const declaredParameterType = (parameter: ts.Symbol) => checker.getTypeOfSymbol(parameter)

  const boxedExtraction =
    (signature: ts.Signature) =>
    (contextual: ts.Type) =>
    (typeParameter: ts.Type): ReadonlyArray<ts.Type> => {
      const declaredReturn = signature.getReturnType()
      const contextualMembers = typeMembers(contextual)
      const declaredMembers = typeMembers(declaredReturn)
      const extractForParameter = memberExtractions(typeParameter)
      const extractMembers = extractForParameter(contextualMembers)

      return Array.flatMap(declaredMembers, extractMembers)
    }

  const signatureBoxedTypes =
    (argumentPosition: number) =>
    (contextual: ts.Type) =>
    (signature: ts.Signature): ReadonlyArray<ts.Type> => {
      const emptyTypes = Array.empty()
      const parameter = Array.get(signature.parameters, argumentPosition)

      return pipe(
        parameter,
        Option.map(declaredParameterType),
        Option.filter(isSignatureTypeParameter),
        Option.map(boxedExtraction(signature)(contextual)),
        Option.getOrElse(Function.constant(emptyTypes))
      )
    }

  const symbolFileEntry =
    (fileName: string) =>
    (symbol: ts.Symbol): readonly [ReferenceKey<ts.Symbol>, string] => {
      const symbolKey = referenceKey(symbol)

      return Tuple.make(symbolKey, fileName)
    }

  const literalConstructionEntries =
    (fileName: string) =>
    (
      literal: ts.ObjectLiteralExpression
    ): ReadonlyArray<readonly [ReferenceKey<ts.Symbol>, string]> => {
      const contextualType = checker.getContextualType(literal)
      const directContextualType = Option.fromNullishOr(contextualType)
      const emptyBoxedTypes = Array.empty()

      const boxedTypes = pipe(
        Option.gen(function* () {
          const argument = outermostTransparentWrapper(literal)
          const call = yield* Option.liftPredicate(ts.isCallExpression)(argument.parent)
          const isArgument = (candidate: ts.Expression) => strictEqual(candidate, argument)
          const argumentPosition = yield* Array.findFirstIndex(call.arguments, isArgument)
          const callContextualType = checker.getContextualType(call)
          const contextual = yield* Option.fromNullishOr(callContextualType)
          const signatures = checker.getTypeAtLocation(call.expression).getCallSignatures()

          return Array.flatMap(signatures, signatureBoxedTypes(argumentPosition)(contextual))
        }),
        Option.getOrElse(Function.constant(emptyBoxedTypes))
      )

      const contextualCandidates = pipe(
        Option.toArray(directContextualType),
        Array.appendAll(boxedTypes)
      )

      const targetTypes = Array.flatMap(contextualCandidates, candidateTypes(literal))

      const objectTypeSymbols = Array.filterMap(
        targetTypes,
        Function.flow(typeObjectTypeSymbol, Result.fromOption(Function.constVoid))
      )

      return Array.map(objectTypeSymbols, symbolFileEntry(fileName))
    }

  const fileConstructionEntries = (
    sourceFile: ts.SourceFile
  ): ReadonlyArray<readonly [ReferenceKey<ts.Symbol>, string]> =>
    pipe(
      Array.empty(),
      foldAst(addObjectLiteral)(sourceFile),
      Array.flatMap(literalConstructionEntries(sourceFile.fileName))
    )

  const programSourceFiles = context.program.getSourceFiles()
  const filtered = Array.filter(programSourceFiles, isProjectSourceFile)
  const flatMapped = Array.flatMap(filtered, fileConstructionEntries)

  return Array.reduce(flatMapped, emptyIndex, addConstructionEntry)
}

const objectTypeDeclarationMatches =
  (index: HashMap.HashMap<ReferenceKey<ts.Symbol>, string>) => (context: CheckContext) => {
    const checker = context.checker
    const toRelative = toRelativeFileName(context.projectRoot)
    const match = makeDetection(context)

    const matches = (
      declaration: ts.InterfaceDeclaration | ts.TypeAliasDeclaration
    ): ReadonlyArray<Detection> =>
      pipe(
        checker.getSymbolAtLocation(declaration.name),
        Option.fromNullishOr,
        Option.flatMap((symbol) => {
          const symbolKey = referenceKey(symbol)

          return HashMap.get(index, symbolKey)
        }),
        Option.map((constructionFileName) => {
          const typeName = declaration.name.text
          const exampleFile = toRelative(constructionFileName)
          const kindLabel = ts.isInterfaceDeclaration(declaration) ? "an interface" : "a type alias"

          return match({
            node: declaration.name,
            message:
              `Avoid declaring ${typeName} as ${kindLabel} when this project constructs ` +
              "its values.",
            hint:
              `Object literals of this shape are built in ${exampleFile}, so ${typeName} is a ` +
              "data definition rather than a boundary type. Define it as an Effect schema " +
              "record — export const " +
              `${typeName} = Schema.Struct({ ... }); export interface ${typeName} extends ` +
              `Schema.Schema.Type<typeof ${typeName}> {}. Construct trusted values with ` +
              `${typeName}.make({ ... }) and decode unknown input at the boundary. Use ` +
              "Schema.TaggedErrorClass only for typed errors; keep process-bound runtime values " +
              "as boundary types or explicit runtime data."
          })
        }),
        Option.toArray
      )

    return matches
  }

const isReadonlyTypeOperator = (node: ts.TypeNode): node is ts.TypeOperatorNode => {
  const isReadonlyOperator = (operator: ts.TypeOperatorNode) =>
    strictEqual(operator.operator, ts.SyntaxKind.ReadonlyKeyword)

  return pipe(Option.liftPredicate(ts.isTypeOperatorNode)(node), Option.exists(isReadonlyOperator))
}

const typeAliasTypeNode = Struct.get<ts.TypeAliasDeclaration, "type">("type")

const tupleTypeNode = (node: ts.TypeNode): Option.Option<ts.TupleTypeNode> => {
  const fromParenthesized = (parenthesized: ts.ParenthesizedTypeNode) =>
    tupleTypeNode(parenthesized.type)

  const fromReadonlyOperator = (operator: ts.TypeOperatorNode) => tupleTypeNode(operator.type)
  const noneTupleType = Option.none<ts.TupleTypeNode>()

  return pipe(
    Match.value(node),
    Match.when(ts.isTupleTypeNode, Option.some<ts.TupleTypeNode>),
    Match.when(ts.isParenthesizedTypeNode, fromParenthesized),
    Match.when(isReadonlyTypeOperator, fromReadonlyOperator),
    Match.orElse(Function.constant(noneTupleType))
  )
}

const isTupleTypeAliasDeclaration = (node: ts.Node): node is ts.TypeAliasDeclaration =>
  pipe(
    Option.liftPredicate(ts.isTypeAliasDeclaration)(node),
    Option.map(typeAliasTypeNode),
    Option.flatMap(tupleTypeNode),
    Option.isSome
  )

const tupleTypeHint =
  "Replace a constructed tuple alias with a named Effect schema record, for example " +
  "export const Example = Schema.Struct({ myString: Schema.String, myNumber: " +
  "Schema.Number }); export interface Example extends Schema.Schema.Type<typeof Example> {}. " +
  "Keep a tuple only when its positions are inherently meaningful; process-bound runtime values " +
  "remain boundary types or explicit runtime data."

const tupleTypeDeclarationMatches = (context: CheckContext) => {
  const match = makeDetection(context)

  const matches = (declaration: ts.TypeAliasDeclaration): ReadonlyArray<Detection> => {
    const typeName = declaration.name.text

    const reported = match({
      node: declaration.name,
      message: `Avoid declaring ${typeName} as a tuple type alias.`,
      hint: tupleTypeHint
    })

    return Array.of(reported)
  }

  return matches
}

const isObjectTypeAliasDeclaration = (node: ts.Node): node is ts.TypeAliasDeclaration =>
  ts.isTypeAliasDeclaration(node) && ts.isTypeLiteralNode(node.type)

const schemaRecordListeners = (
  index: HashMap.HashMap<ReferenceKey<ts.Symbol>, string>
): ReadonlyArray<Subscription> => {
  const interfaceDeclarationKinds = Array.of(ts.SyntaxKind.InterfaceDeclaration)

  const interfaceListeners = nodeSubscriptions(interfaceDeclarationKinds)(
    ts.isInterfaceDeclaration
  )(objectTypeDeclarationMatches(index))

  const typeAliasDeclarationKinds = Array.of(ts.SyntaxKind.TypeAliasDeclaration)

  const objectTypeAliasListeners = nodeSubscriptions(typeAliasDeclarationKinds)(
    isObjectTypeAliasDeclaration
  )(objectTypeDeclarationMatches(index))

  const tupleTypeAliasListeners = nodeSubscriptions(typeAliasDeclarationKinds)(
    isTupleTypeAliasDeclaration
  )(tupleTypeDeclarationMatches)

  return pipe(
    interfaceListeners,
    Array.appendAll(objectTypeAliasListeners),
    Array.appendAll(tupleTypeAliasListeners)
  )
}

const schemaRecordPlan = Function.compose(buildConstructionIndex, schemaRecordListeners)

export const preferEffectSchemaRecord = makePlannedCheck(
  "prefer-effect-schema-record",
  schemaRecordPlan
)
