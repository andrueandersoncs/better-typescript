import { Array, Function, HashMap, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { nodeSubscriptions, withProgramIndex } from "@better-typescript/core/engine/check"
import {
  outermostTransparentWrapper
} from "./support/tsNode.js"
import { foldAst, isProjectSourceFile, type AstFold } from "@better-typescript/core/engine/sources"
import { detection, toRelativeFileName } from "@better-typescript/core/engine/location"
import type { Check, CheckContext, Subscription } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location"
import type { ProgramContext } from "@better-typescript/core/engine/sources"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example"

import {
  fixtureRefactorExamples
} from "../fixtureExamples.js"
type ConstructionIndex = HashMap.HashMap<ts.Symbol, string>

const propertyNameText = (name: ts.PropertyName): Option.Option<string> =>
  pipe(
    Option.liftPredicate(ts.isIdentifier)(name),
    Option.map(Struct.get("text"))
  )

const namedPropertyText = (
  property: ts.ObjectLiteralElementLike
): Option.Option<string> =>
  pipe(Option.fromNullable(property.name), Option.flatMap(propertyNameText))

type ObjectTypeDeclaration = ts.InterfaceDeclaration | ts.TypeAliasDeclaration

const isProjectObjectTypeDeclaration = (
  declaration: ts.Declaration
): boolean => {
  const sourceFile = declaration.getSourceFile()
    const conditions = [
    ts.isInterfaceDeclaration(declaration),
    ts.isTypeAliasDeclaration(declaration) &&
      ts.isTypeLiteralNode(declaration.type)
  ]
const isRelevantDeclaration = Array.some(conditions, Boolean)

  return isProjectSourceFile(sourceFile) && isRelevantDeclaration
}

const isProjectObjectTypeSymbol = (symbol: ts.Symbol): boolean =>
  Array.some((symbol.declarations ?? []), isProjectObjectTypeDeclaration)

const typeObjectTypeSymbol = (type: ts.Type): Option.Option<ts.Symbol> => {
  const symbol = type.getSymbol()
  const directSymbol = pipe(
    Option.fromNullable(symbol),
    Option.filter(isProjectObjectTypeSymbol)
  )
  const aliasSymbol = pipe(
    Option.fromNullable(type.aliasSymbol),
    Option.filter(isProjectObjectTypeSymbol)
  )
  const fallbackAlias = Function.constant(aliasSymbol)

  return Option.orElse(directSymbol, fallbackAlias)
}

const isObjectType = (type: ts.Type): type is ts.ObjectType =>
  (type.flags & ts.TypeFlags.Object) !== 0

const hasReferenceObjectFlag = (type: ts.ObjectType): boolean =>
  (type.objectFlags & ts.ObjectFlags.Reference) !== 0

const isTypeReference = (type: ts.Type): type is ts.TypeReference => {
  const objectType = Option.liftPredicate(isObjectType)(type)

  return Option.exists(objectType, hasReferenceObjectFlag)
}

const typeMembers = (type: ts.Type): ReadonlyArray<ts.Type> =>
  type.isUnion() ? type.types : [type]

const isSignatureTypeParameter = (type: ts.Type): boolean =>
  type.isTypeParameter()

const addObjectLiteral: AstFold<ReadonlyArray<ts.ObjectLiteralExpression>> = (
  literals,
  node
) =>
  ts.isObjectLiteralExpression(node) ? Array.append(literals, node) : literals

const addConstructionEntry = (
  index: ConstructionIndex,
  entry: readonly [ts.Symbol, string]
): ConstructionIndex =>
  HashMap.has(index, entry[0]) ? index : HashMap.set(index, entry[0], entry[1])

const buildConstructionIndex = (context: ProgramContext): ConstructionIndex => {
  const emptyIndex = HashMap.empty<ts.Symbol, string>()
  const checker = context.checker

  const typeHasProperty =
    (type: ts.Type) =>
    (name: string): boolean => {
      const declaredProperty = type.getProperty(name)
      const property = Option.fromNullable(declaredProperty)

      return Option.isSome(property)
    }

  const matchesLiteralShape =
    (literal: ts.ObjectLiteralExpression) =>
    (type: ts.Type): boolean => {
        const propertyNames = Array.filterMap(literal.properties, namedPropertyText)

        return Array.every(propertyNames, typeHasProperty(type))
      }

  const candidateTypes =
    (literal: ts.ObjectLiteralExpression) =>
    (contextualType: ts.Type): ReadonlyArray<ts.Type> =>
      contextualType.isUnion()
        ? Array.filter(contextualType.types, matchesLiteralShape(literal))
        : [contextualType]

  const hasTypeReferenceTarget =
    (target: ts.GenericType) =>
    (reference: ts.TypeReference): boolean =>
      reference.target === target

  const sameTypeReferenceTarget =
    (declaredMember: ts.TypeReference) =>
    (contextualMember: ts.Type): contextualMember is ts.TypeReference => {
      const reference = Option.liftPredicate(isTypeReference)(contextualMember)

      return Option.exists(
        reference,
        hasTypeReferenceTarget(declaredMember.target)
      )
    }

  const typeArgumentAt =
    (parameterPosition: number) =>
    (reference: ts.TypeReference): Option.Option<ts.Type> => {
      const typeArguments = checker.getTypeArguments(reference)

      return Option.fromNullable(typeArguments[parameterPosition])
    }

  const referenceTypeArgument =
    (typeParameter: ts.Type) =>
    (contextualMembers: ReadonlyArray<ts.Type>) =>
    (declaredMember: ts.TypeReference): ReadonlyArray<ts.Type> => {
      const typeArguments = checker.getTypeArguments(declaredMember)
      const parameterPosition = pipe(
        Array.findFirstIndex(
          typeArguments,
          (candidate) => candidate === typeParameter
        ),
        Option.getOrElse(() => -1)
      )

      if (parameterPosition < 0) {
        return []
      }

      const matchingMembers = Array.filter(contextualMembers, sameTypeReferenceTarget(declaredMember))

      return Array.filterMap(matchingMembers, typeArgumentAt(parameterPosition))
    }

  const memberExtractions =
    (typeParameter: ts.Type) =>
    (contextualMembers: ReadonlyArray<ts.Type>) =>
    (declaredMember: ts.Type): ReadonlyArray<ts.Type> => {
      if (declaredMember === typeParameter) {
        return contextualMembers
      }

      return pipe(
        Option.liftPredicate(isTypeReference)(declaredMember),
        Option.map(referenceTypeArgument(typeParameter)(contextualMembers)),
        Option.getOrElse(Function.constant([]))
      )
    }

  const declaredParameterType = (parameter: ts.Symbol): ts.Type =>
    checker.getTypeOfSymbol(parameter)

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
    (signature: ts.Signature): ReadonlyArray<ts.Type> =>
      pipe(
        Option.fromNullable(signature.parameters[argumentPosition]),
        Option.map(declaredParameterType),
        Option.filter(isSignatureTypeParameter),
        Option.map(boxedExtraction(signature)(contextual)),
        Option.getOrElse(Function.constant([]))
      )

  const symbolFileEntry =
    (fileName: string) =>
    (symbol: ts.Symbol): readonly [ts.Symbol, string] => [symbol, fileName]

  const literalConstructionEntries =
    (fileName: string) =>
    (
      literal: ts.ObjectLiteralExpression
    ): ReadonlyArray<readonly [ts.Symbol, string]> => {
      const contextualType = checker.getContextualType(literal)
      const directContextualType = Option.fromNullable(contextualType)
      const boxedTypes = pipe(
        Option.gen(function* () {
          const argument = outermostTransparentWrapper(literal)
          const call = yield* Option.liftPredicate(ts.isCallExpression)(
            argument.parent
          )
          const argumentPosition = yield* Array.findFirstIndex(
            call.arguments,
            (candidate) => candidate === argument
          )
          const callContextualType = checker.getContextualType(call)
          const contextual = yield* Option.fromNullable(callContextualType)
          const signatures = checker
            .getTypeAtLocation(call.expression)
            .getCallSignatures()

          return Array.flatMap(signatures, signatureBoxedTypes(argumentPosition)(contextual))
        }),
        Option.getOrElse(Function.constant([]))
      )
      const contextualCandidates = pipe(
        Option.toArray(directContextualType),
        Array.appendAll(boxedTypes)
      )
      const targetTypes = Array.flatMap(
        contextualCandidates,
        candidateTypes(literal)
      )

      const objectTypeSymbols = Array.filterMap(
        targetTypes,
        typeObjectTypeSymbol
      )

      return Array.map(objectTypeSymbols, symbolFileEntry(fileName))
    }

  const fileConstructionEntries = (
    sourceFile: ts.SourceFile
  ): ReadonlyArray<readonly [ts.Symbol, string]> => {
    const literals = foldAst(addObjectLiteral)(sourceFile)([])

    return Array.flatMap(literals, literalConstructionEntries(sourceFile.fileName))
  }

  const programSourceFiles = context.program.getSourceFiles()
  const filtered = Array.filter(programSourceFiles, isProjectSourceFile)
  const flatMapped = Array.flatMap(filtered, fileConstructionEntries)

  return Array.reduce(flatMapped, emptyIndex, addConstructionEntry)
}

const objectTypeDeclarationMatches =
  (index: ConstructionIndex) => (context: CheckContext) => {
    const checker = context.checker
    const toRelative = toRelativeFileName(context.projectRoot)
    const match = detection(context)

    const matches = (
      declaration: ObjectTypeDeclaration
    ): ReadonlyArray<Detection> => {
      const declarationSymbol = checker.getSymbolAtLocation(declaration.name)

      return pipe(
        Option.fromNullable(declarationSymbol),
        Option.flatMap((symbol) => HashMap.get(index, symbol)),
        Option.map((constructionFileName) => {
          const typeName = declaration.name.text
          const exampleFile = toRelative(constructionFileName)
          const kindLabel = ts.isInterfaceDeclaration(declaration)
            ? "an interface"
            : "a type alias"

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
              "so every construction is validated. When the shape must hold non-serializable " +
              "runtime values (streams, functions, ts compiler objects), extend Data.Class " +
              `instead — class ${typeName} extends Data.Class<{ ... }> {} — the same ` +
              "class-as-type-and-constructor discipline without schema validation."
          })
        }),
        Option.toArray
      )
    }

    return matches
  }

const isObjectTypeAliasDeclaration = (
  node: ts.Node
): node is ts.TypeAliasDeclaration =>
  ts.isTypeAliasDeclaration(node) && ts.isTypeLiteralNode(node.type)

const schemaClassListeners = (
  index: ConstructionIndex
): ReadonlyArray<Subscription> => {
  const interfaceListeners = nodeSubscriptions([
    ts.SyntaxKind.InterfaceDeclaration
  ])(ts.isInterfaceDeclaration)(objectTypeDeclarationMatches(index))
  const typeAliasListeners = nodeSubscriptions([
    ts.SyntaxKind.TypeAliasDeclaration
  ])(isObjectTypeAliasDeclaration)(objectTypeDeclarationMatches(index))

  return Array.appendAll(interfaceListeners, typeAliasListeners)
}

const check = withProgramIndex(buildConstructionIndex)(schemaClassListeners)

export const preferEffectSchemaClass: Check = check

export const preferEffectSchemaClassExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("prefer-effect-schema-class")
