import { Tuple, Array, Equal, Function, HashMap, Match, Option, Struct, pipe, Result } from "effect"
import * as ts from "typescript"
import { outermostTransparentWrapper } from "./support/tsNode.js"
import { foldAst, isProjectSourceFile, type AstFold } from "@better-typescript/core/engine/sources"
import { definePlannedCheck } from "../defineCheck.js"
import type { CheckContext, Subscription } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"

import { toRelativeFileName } from "@better-typescript/core/engine/location"
import { nodeSubscriptions, detection } from "@better-typescript/core/engine/check"

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

const isObjectType = (type: ts.Type): type is ts.ObjectType =>
  (type.flags & ts.TypeFlags.Object) !== 0

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
  index: HashMap.HashMap<ts.Symbol, string>,
  entry: readonly [ts.Symbol, string]
) => {
  const symbolKey = Equal.byReferenceUnsafe(entry[0])

  return HashMap.has(index, symbolKey) ? index : HashMap.set(index, symbolKey, entry[1])
}

const buildConstructionIndex = (context: ProgramContext) => {
  const emptyIndex = HashMap.empty<ts.Symbol, string>()
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
    reference.target === target

  const sameTypeReferenceTarget =
    (declaredMember: ts.TypeReference) =>
    (contextualMember: ts.Type): contextualMember is ts.TypeReference => {
      const reference = Option.liftPredicate(isTypeReference)(contextualMember)

      return Option.exists(reference, hasTypeReferenceTarget(declaredMember.target))
    }

  const typeArgumentAt = (parameterPosition: number) => (reference: ts.TypeReference) => {
    const typeArguments = checker.getTypeArguments(reference)

    return Option.fromNullishOr(typeArguments[parameterPosition])
  }

  const referenceTypeArgument =
    (typeParameter: ts.Type) =>
    (contextualMembers: ReadonlyArray<ts.Type>) =>
    (declaredMember: ts.TypeReference): ReadonlyArray<ts.Type> => {
      const typeArguments = checker.getTypeArguments(declaredMember)

      const parameterPosition = pipe(
        Array.findFirstIndex(typeArguments, (candidate) => candidate === typeParameter),
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
      if (declaredMember === typeParameter) {
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
      return pipe(
        Option.fromNullishOr(signature.parameters[argumentPosition]),
        Option.map(declaredParameterType),
        Option.filter(isSignatureTypeParameter),
        Option.map(boxedExtraction(signature)(contextual)),
        Option.getOrElse(Function.constant(emptyTypes))
      )
    }

  const symbolFileEntry =
    (fileName: string) =>
    (symbol: ts.Symbol): readonly [ts.Symbol, string] => {
      const symbolKey = Equal.byReferenceUnsafe(symbol)

      return Tuple.make(symbolKey, fileName)
    }

  const literalConstructionEntries =
    (fileName: string) =>
    (literal: ts.ObjectLiteralExpression): ReadonlyArray<readonly [ts.Symbol, string]> => {
      const contextualType = checker.getContextualType(literal)
      const directContextualType = Option.fromNullishOr(contextualType)
      const emptyBoxedTypes = Array.empty()

      const boxedTypes = pipe(
        Option.gen(function* () {
          const argument = outermostTransparentWrapper(literal)
          const call = yield* Option.liftPredicate(ts.isCallExpression)(argument.parent)

          const argumentPosition = yield* Array.findFirstIndex(
            call.arguments,
            (candidate) => candidate === argument
          )

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
  ): ReadonlyArray<readonly [ts.Symbol, string]> =>
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
  (index: HashMap.HashMap<ts.Symbol, string>) => (context: CheckContext) => {
    const checker = context.checker
    const toRelative = toRelativeFileName(context.projectRoot)
    const match = detection(context)

    const matches = (
      declaration: ts.InterfaceDeclaration | ts.TypeAliasDeclaration
    ): ReadonlyArray<Detection> =>
      pipe(
        checker.getSymbolAtLocation(declaration.name),
        Option.fromNullishOr,
        Option.flatMap((symbol) => {
          const symbolKey = Equal.byReferenceUnsafe(symbol)

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
              "data definition rather than a boundary type. Replace it with an Effect " +
              `Schema class — class ${typeName} extends ` +
              `Schema.Class<${typeName}>("${typeName}")({ ... }) {} (or Schema.TaggedClass ` +
              "for tagged variants). The class is both the type and the constructor: keep using " +
              `${typeName} in annotations and build values with new ${typeName}({ ... }) ` +
              "so every construction is validated. When the shape must hold process-bound " +
              "runtime values (streams, functions, ts compiler objects), extend Data.Class " +
              "instead, or Data.TaggedClass when the runtime-only data needs a _tag. Both " +
              "preserve the class-as-type-and-constructor discipline without schema validation."
          })
        }),
        Option.toArray
      )

    return matches
  }

const isReadonlyTypeOperator = (node: ts.TypeNode): node is ts.TypeOperatorNode =>
  pipe(
    Option.liftPredicate(ts.isTypeOperatorNode)(node),
    Option.exists((operator) => operator.operator === ts.SyntaxKind.ReadonlyKeyword)
  )

const tupleTypeNode = (node: ts.TypeNode): Option.Option<ts.TupleTypeNode> =>
  pipe(
    Match.value(node),
    Match.when(ts.isTupleTypeNode, Option.some<ts.TupleTypeNode>),
    Match.when(ts.isParenthesizedTypeNode, (parenthesized) => tupleTypeNode(parenthesized.type)),
    Match.when(isReadonlyTypeOperator, (operator) => tupleTypeNode(operator.type)),
    Match.orElse(() => Option.none())
  )

const isTupleTypeAliasDeclaration = (node: ts.Node): node is ts.TypeAliasDeclaration =>
  pipe(
    Option.liftPredicate(ts.isTypeAliasDeclaration)(node),
    Option.flatMap((declaration) => tupleTypeNode(declaration.type)),
    Option.isSome
  )

const tupleTypeHint =
  "Any tuple-shaped data can be converted to a class with named fields, making each " +
  "value's meaning explicit instead of positional. Replace the tuple alias with an " +
  "Effect Schema class — for example class ExampleClass extends " +
  'Schema.Class<ExampleClass>("ExampleClass")({ myString: Schema.String, ' +
  "myNumber: Schema.Number }) {} — or Schema.TaggedClass for a tagged variant. " +
  "When fields hold process-bound runtime values, use Data.Class — class " +
  "ExampleClass extends Data.Class<{ readonly stream: Stream.Stream<string> }> {} — " +
  "or Data.TaggedClass for a process-bound tagged variant — class " +
  'ExampleClass extends Data.TaggedClass("ExampleClass")<{ readonly stream: ' +
  "Stream.Stream<string> }> {}."

const tupleTypeDeclarationMatches = (context: CheckContext) => {
  const match = detection(context)

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

const schemaClassListeners = (
  index: HashMap.HashMap<ts.Symbol, string>
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

const schemaClassPlan = Function.compose(buildConstructionIndex, schemaClassListeners)

export const preferEffectSchemaClass = definePlannedCheck(
  "prefer-effect-schema-class",
  schemaClassPlan
)
