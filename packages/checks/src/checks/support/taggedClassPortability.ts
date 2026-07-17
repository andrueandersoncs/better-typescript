import { Array, Function, Match, Option, Struct, pipe, Result } from "effect"
import * as ts from "typescript"
import { isExtendsClause, resolvedSymbolAt, unwrapCallee } from "./tsNode.js"
import { differentBaseConstraint, type SeenTypes } from "./tsType.js"

const effectDataModuleSuffixes = Array.make("/effect/dist/Data.d.ts", "/effect/src/Data.ts")

const effectSchemaModuleSuffixes = Array.make("/effect/dist/Schema.d.ts", "/effect/src/Schema.ts")

const taggedClassSymbolNode = (expression: ts.Expression): Option.Option<ts.Node> => {
  if (ts.isPropertyAccessExpression(expression)) {
    return Option.some(expression.name)
  }

  return ts.isIdentifier(expression) ? Option.some(expression) : Option.none()
}

const declarationComesFromEffectModule =
  (moduleSuffixes: ReadonlyArray<string>) =>
  (declaration: ts.Declaration): boolean => {
    const fileName = declaration.getSourceFile().fileName.replaceAll("\\", "/")

    return Array.some(moduleSuffixes, (suffix) => fileName.endsWith(suffix))
  }

const symbolIsEffectTaggedClass =
  (moduleSuffixes: ReadonlyArray<string>) =>
  (symbol: ts.Symbol): boolean => {
    const nameIsTaggedClass = symbol.getName() === "TaggedClass"

    const declarations = pipe(
      symbol.getDeclarations(),
      Option.fromNullishOr,
      Option.getOrElse(() => Array.empty<ts.Declaration>())
    )

    const declarationFromEffectModule = Array.some(
      declarations,
      declarationComesFromEffectModule(moduleSuffixes)
    )

    const conditions = Array.make(nameIsTaggedClass, declarationFromEffectModule)

    return Array.every(conditions, Boolean)
  }

const taggedClassHeritage =
  (moduleSuffixes: ReadonlyArray<string>) =>
  (checker: ts.TypeChecker) =>
  (declaration: ts.ClassDeclaration): Option.Option<ts.ExpressionWithTypeArguments> => {
    const clauses = declaration.heritageClauses ?? Array.empty()
    const extendsClauses = Array.filter(clauses, isExtendsClause)
    const heritageTypes = Array.flatMap(extendsClauses, Struct.get("types"))

    const heritageIsEffectTaggedClass = (heritage: ts.ExpressionWithTypeArguments): boolean =>
      pipe(
        heritage.expression,
        unwrapCallee,
        taggedClassSymbolNode,
        Option.flatMap(resolvedSymbolAt(checker)),
        Option.exists(symbolIsEffectTaggedClass(moduleSuffixes))
      )

    return Array.findFirst(heritageTypes, heritageIsEffectTaggedClass)
  }

export const dataTaggedClassHeritage = taggedClassHeritage(effectDataModuleSuffixes)

export const schemaTaggedClassHeritage = taggedClassHeritage(effectSchemaModuleSuffixes)

const wirePrimitiveTypeFlags =
  ts.TypeFlags.StringLike |
  ts.TypeFlags.NumberLike |
  ts.TypeFlags.BooleanLike |
  ts.TypeFlags.Null |
  ts.TypeFlags.EnumLike |
  ts.TypeFlags.Never

const rejectedWireTypeFlags =
  ts.TypeFlags.Any |
  ts.TypeFlags.Unknown |
  ts.TypeFlags.Undefined |
  ts.TypeFlags.Void |
  ts.TypeFlags.ESSymbolLike |
  ts.TypeFlags.BigIntLike |
  ts.TypeFlags.NonPrimitive

const typeHasAnyFlags =
  (flags: ts.TypeFlags) =>
  (type: ts.Type): boolean =>
    (type.flags & flags) !== 0

const typeIsObject = (type: ts.Type): type is ts.ObjectType =>
  (type.flags & ts.TypeFlags.Object) !== 0

const typeIsUnion = (type: ts.Type): type is ts.UnionType => type.isUnion()

const typeIsIntersection = (type: ts.Type): type is ts.IntersectionType => type.isIntersection()

const typeIsWirePrimitive = typeHasAnyFlags(wirePrimitiveTypeFlags)

const typeIsRejectedWireValue = typeHasAnyFlags(rejectedWireTypeFlags)

const typeWasSeen =
  (seen: SeenTypes) =>
  (type: ts.Type): boolean =>
    Array.some(seen, (candidate) => candidate === type)

const definedUnionMembers = (type: ts.UnionType): ReadonlyArray<ts.Type> =>
  Array.filter(type.types, (member) => (member.flags & ts.TypeFlags.Undefined) === 0)

const propertyHasCompilerName = (property: ts.Symbol): boolean =>
  property.getName().startsWith("__@")

const propertyTypeIsWireSafe =
  (checker: ts.TypeChecker) =>
  (location: ts.Node) =>
  (seen: SeenTypes) =>
  (property: ts.Symbol): boolean =>
    pipe(
      Match.value(property),
      Match.when(propertyHasCompilerName, Function.constFalse),
      Match.orElse((namedProperty) => {
        const propertyLocation = pipe(
          namedProperty.getDeclarations(),
          Option.fromNullishOr,
          Option.flatMap(Array.head),
          Option.getOrElse(Function.constant(location))
        )

        const propertyType = checker.getTypeOfSymbolAtLocation(namedProperty, propertyLocation)
        const isOptional = (namedProperty.flags & ts.SymbolFlags.Optional) !== 0
        const optionalUnion = isOptional && propertyType.isUnion()
        const members = optionalUnion ? definedUnionMembers(propertyType) : Array.of(propertyType)
        const checkType = typeIsWireSafeWithSeen(checker)(location)(seen)
        const hasDefinedMember = members.length > 0
        const everyMemberIsWireSafe = Array.every(members, checkType)
        const conditions = Array.make(hasDefinedMember, everyMemberIsWireSafe)

        return Array.every(conditions, Boolean)
      })
    )

const intersectionTypeIsWireSafe =
  (checkType: (type: ts.Type) => boolean) =>
  (type: ts.IntersectionType): boolean =>
    pipe(
      Array.findFirst(type.types, typeIsWirePrimitive),
      Option.match({
        onNone: () => Array.every(type.types, checkType),
        onSome: Function.constTrue
      })
    )

const objectTypeHasSignatures = (type: ts.ObjectType): boolean => {
  const callSignatureCount = type.getCallSignatures().length
  const constructSignatureCount = type.getConstructSignatures().length
  const signatureCounts = Array.make(callSignatureCount, constructSignatureCount)

  return Array.some(signatureCounts, (count) => count > 0)
}

const objectTypeIsCollection =
  (checker: ts.TypeChecker) =>
  (type: ts.ObjectType): boolean => {
    const isArray = checker.isArrayType(type)
    const isTuple = checker.isTupleType(type)
    const collectionChecks = Array.make(isArray, isTuple)

    return Array.some(collectionChecks, Boolean)
  }

const collectionTypeIsWireSafe =
  (checker: ts.TypeChecker) =>
  (checkType: (type: ts.Type) => boolean) =>
  (type: ts.ObjectType): boolean =>
    pipe(
      checker.getIndexTypeOfType(type, ts.IndexKind.Number),
      Option.fromNullishOr,
      Option.exists(checkType)
    )

const objectTypeIsClass = (type: ts.ObjectType): boolean =>
  (type.objectFlags & ts.ObjectFlags.Class) !== 0

const structuralObjectTypeIsWireSafe =
  (checker: ts.TypeChecker) =>
  (location: ts.Node) =>
  (seen: SeenTypes) =>
  (checkType: (type: ts.Type) => boolean) =>
  (type: ts.ObjectType): boolean => {
    const stringIndexType = checker.getIndexTypeOfType(type, ts.IndexKind.String)
    const numberIndexType = checker.getIndexTypeOfType(type, ts.IndexKind.Number)
    const possibleIndexTypes = Array.make(stringIndexType, numberIndexType)
    const indexTypes = Array.filterMap(possibleIndexTypes, Result.fromNullishOr(Function.constVoid))
    const indexTypesAreWireSafe = Array.every(indexTypes, checkType)
    const properties = checker.getPropertiesOfType(type)
    const hasStructuralMembers = properties.length + indexTypes.length > 0
    const checkProperty = propertyTypeIsWireSafe(checker)(location)(seen)
    const propertiesAreWireSafe = Array.every(properties, checkProperty)

    const structuralChecks = Array.make(
      indexTypesAreWireSafe,
      hasStructuralMembers,
      propertiesAreWireSafe
    )

    return Array.every(structuralChecks, Boolean)
  }

const objectTypeIsWireSafe =
  (checker: ts.TypeChecker) =>
  (location: ts.Node) =>
  (seen: SeenTypes) =>
  (checkType: (type: ts.Type) => boolean) =>
  (type: ts.ObjectType): boolean =>
    pipe(
      Match.value(type),
      Match.when(objectTypeHasSignatures, Function.constFalse),
      Match.when(objectTypeIsCollection(checker), collectionTypeIsWireSafe(checker)(checkType)),
      Match.when(objectTypeIsClass, Function.constFalse),
      Match.orElse(structuralObjectTypeIsWireSafe(checker)(location)(seen)(checkType))
    )

const unconstrainedTypeIsWireSafe =
  (checker: ts.TypeChecker) =>
  (location: ts.Node) =>
  (seen: SeenTypes) =>
  (checkType: (type: ts.Type) => boolean) =>
  (type: ts.Type): boolean =>
    pipe(
      Match.value(type),
      Match.when(typeIsObject, objectTypeIsWireSafe(checker)(location)(seen)(checkType)),
      Match.orElse(Function.constFalse)
    )

const constrainedOrStructuralTypeIsWireSafe =
  (checker: ts.TypeChecker) =>
  (location: ts.Node) =>
  (seen: SeenTypes) =>
  (checkType: (type: ts.Type) => boolean) =>
  (type: ts.Type): boolean => {
    const baseConstraint = differentBaseConstraint(checker)(type)
    const checkUnconstrained = unconstrainedTypeIsWireSafe(checker)(location)(seen)(checkType)

    return pipe(
      baseConstraint,
      Option.match({
        onNone: () => checkUnconstrained(type),
        onSome: checkType
      })
    )
  }

const typeIsWireSafeWithSeen =
  (checker: ts.TypeChecker) =>
  (location: ts.Node) =>
  (seen: SeenTypes) =>
  (type: ts.Type): boolean => {
    const nextSeen = Array.append(seen, type)
    const checkType = typeIsWireSafeWithSeen(checker)(location)(nextSeen)

    const checkConstrainedOrStructural =
      constrainedOrStructuralTypeIsWireSafe(checker)(location)(nextSeen)(checkType)

    return pipe(
      Match.value(type),
      Match.when(typeIsWirePrimitive, Function.constTrue),
      Match.when(typeIsRejectedWireValue, Function.constFalse),
      Match.when(typeWasSeen(seen), Function.constTrue),
      Match.when(typeIsUnion, (union) => Array.every(union.types, checkType)),
      Match.when(typeIsIntersection, intersectionTypeIsWireSafe(checkType)),
      Match.orElse(checkConstrainedOrStructural)
    )
  }

// Wire-safe means every reachable value encodes portably because opaque identities are rejected.
export const typeIsWireSafe =
  (checker: ts.TypeChecker) =>
  (location: ts.Node) =>
  (type: ts.Type): boolean => {
    const seen = Array.empty<ts.Type>()
    const checkType = typeIsWireSafeWithSeen(checker)(location)(seen)

    return checkType(type)
  }

export const schemaTaggedClassEncodedType =
  (checker: ts.TypeChecker) =>
  (declaration: ts.ClassDeclaration): Option.Option<ts.Type> =>
    pipe(
      schemaTaggedClassHeritage(checker)(declaration),
      Option.flatMap(() =>
        pipe(
          declaration.name,
          Option.fromNullishOr,
          Option.flatMap(resolvedSymbolAt(checker)),
          Option.map((symbol) => checker.getTypeOfSymbolAtLocation(symbol, declaration)),
          Option.flatMap((staticType) =>
            pipe(staticType.getProperty("Encoded"), Option.fromNullishOr)
          ),
          Option.map((encoded) => checker.getTypeOfSymbolAtLocation(encoded, declaration))
        )
      )
    )
