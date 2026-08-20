import { Array, Function, Match, Option, Result, Schema, pipe } from "effect"
import * as ts from "typescript"
import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../../internal/scanner/makeNodeMatch.js"
import type { MatchContext } from "../../internal/scanner/matchContext.js"
import { namedCandidateTarget } from "../../internal/support/namedCandidateTarget.js"
import { taggedClassHeritage } from "./taggedClassHeritage.js"
import { typeHasAnyFlags } from "./typeHasAnyFlags.js"
import { typeIsWirePrimitive } from "./typeIsWirePrimitive.js"
import { differentBaseConstraint } from "../../internal/support/differentBaseConstraint.js"
import type { SeenTypes } from "../../internal/support/seenTypes.js"
import { strictEqual } from "../../internal/equivalence.js"

// PreferSchemaTaggedStructFact exists because its fields form one stable data contract used by the linter.
export const PreferSchemaTaggedStructFact = Schema.Struct({})

export interface PreferSchemaTaggedStructFact extends Schema.Schema.Type<
  typeof PreferSchemaTaggedStructFact
> {}

// emptyPreferSchemaTaggedStructFact exists because its fields form one stable data contract used by the linter.
export const emptyPreferSchemaTaggedStructFact = PreferSchemaTaggedStructFact.make({})

const effectDataModuleSuffixes = Array.make("/effect/dist/Data.d.ts", "/effect/src/Data.ts")

const dataTaggedClassHeritage = taggedClassHeritage(effectDataModuleSuffixes)

const rejectedWireTypeFlags =
  ts.TypeFlags.Any |
  ts.TypeFlags.Unknown |
  ts.TypeFlags.Undefined |
  ts.TypeFlags.Void |
  ts.TypeFlags.ESSymbolLike |
  ts.TypeFlags.BigIntLike |
  ts.TypeFlags.NonPrimitive

const typeIsObject = (type: ts.Type): type is ts.ObjectType =>
  (type.flags & ts.TypeFlags.Object) !== 0

const typeIsUnion = (type: ts.Type): type is ts.UnionType => type.isUnion()

const typeIsIntersection = (type: ts.Type): type is ts.IntersectionType => type.isIntersection()

const typeIsRejectedWireValue = typeHasAnyFlags(rejectedWireTypeFlags)

const typeWasSeen =
  (seen: SeenTypes) =>
  (type: ts.Type): boolean => {
    const isSameType = strictEqual(type)

    return Array.some(seen, isSameType)
  }

const memberIsDefined = (member: ts.Type) => strictEqual(0)(member.flags & ts.TypeFlags.Undefined)

const definedUnionMembers = (type: ts.UnionType): ReadonlyArray<ts.Type> =>
  Array.filter(type.types, memberIsDefined)

const propertyHasCompilerName = (property: ts.Symbol) => property.getName().startsWith("__@")

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
  (checkType: (type: ts.Type) => boolean) => (type: ts.IntersectionType) =>
    pipe(
      Array.findFirst(type.types, typeIsWirePrimitive),
      Option.match({
        onNone: () => Array.every(type.types, checkType),
        onSome: Function.constTrue
      })
    )

const objectTypeHasSignatures = (type: ts.ObjectType) => {
  const callSignatureCount = type.getCallSignatures().length
  const constructSignatureCount = type.getConstructSignatures().length
  const signatureCounts = Array.make(callSignatureCount, constructSignatureCount)

  return Array.some(signatureCounts, (count) => count > 0)
}

const objectTypeIsCollection = (checker: ts.TypeChecker) => (type: ts.ObjectType) => {
  const isArray = checker.isArrayType(type)
  const isTuple = checker.isTupleType(type)
  const collectionChecks = Array.make(isArray, isTuple)

  return Array.some(collectionChecks, Boolean)
}

const collectionTypeIsWireSafe =
  (checker: ts.TypeChecker) => (checkType: (type: ts.Type) => boolean) => (type: ts.ObjectType) =>
    pipe(
      checker.getIndexTypeOfType(type, ts.IndexKind.Number),
      Option.fromNullishOr,
      Option.exists(checkType)
    )

const objectTypeIsClass = (type: ts.ObjectType) => (type.objectFlags & ts.ObjectFlags.Class) !== 0

const structuralObjectTypeIsWireSafe =
  (checker: ts.TypeChecker) =>
  (location: ts.Node) =>
  (seen: SeenTypes) =>
  (checkType: (type: ts.Type) => boolean) =>
  (type: ts.ObjectType) => {
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
  (type: ts.ObjectType) =>
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
  (type: ts.Type) =>
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
  (type: ts.Type) => {
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

    const unionMembersAreWireSafe = (union: ts.UnionType) => Array.every(union.types, checkType)

    return pipe(
      Match.value(type),
      Match.when(typeIsWirePrimitive, Function.constTrue),
      Match.when(typeIsRejectedWireValue, Function.constFalse),
      Match.when(typeWasSeen(seen), Function.constTrue),
      Match.when(typeIsUnion, unionMembersAreWireSafe),
      Match.when(typeIsIntersection, intersectionTypeIsWireSafe(checkType)),
      Match.orElse(checkConstrainedOrStructural)
    )
  }

// Wire-safe means every reachable value encodes portably because opaque identities are rejected.
const typeIsWireSafe =
  (checker: ts.TypeChecker) =>
  (location: ts.Node) =>
  (type: ts.Type): boolean => {
    const seen = Array.empty<ts.Type>()
    const checkType = typeIsWireSafeWithSeen(checker)(location)(seen)

    return checkType(type)
  }

const fieldsAreWireSafe = (checker: ts.TypeChecker) => (heritage: ts.ExpressionWithTypeArguments) =>
  pipe(
    Option.fromNullishOr(heritage.typeArguments),
    Option.getOrElse(Array.empty),
    Array.head,
    Option.match({
      onNone: Function.constant(true),
      onSome: (fieldsNode) => {
        const isEmptyLiteral = (literal: ts.TypeLiteralNode) =>
          strictEqual(0)(literal.members.length)

        return pipe(
          Option.liftPredicate(ts.isTypeLiteralNode)(fieldsNode),
          Option.filter(isEmptyLiteral),
          Option.match({
            onSome: Function.constant(true),
            onNone: () =>
              pipe(checker.getTypeFromTypeNode(fieldsNode), typeIsWireSafe(checker)(fieldsNode))
          })
        )
      }
    })
  )

const portableDataTaggedClassMatches = (context: MatchContext) => {
  const { checker } = context

  const matches = (declaration: ts.ClassDeclaration) =>
    pipe(
      dataTaggedClassHeritage(checker)(declaration),
      Option.filter(fieldsAreWireSafe(checker)),
      Option.map(() => {
        const target = namedCandidateTarget(declaration)
        const match = makeNodeMatch(target, emptyPreferSchemaTaggedStructFact)

        return match
      }),
      Option.toArray
    )

  return matches
}

const classDeclarationKinds = Array.of(ts.SyntaxKind.ClassDeclaration)

export const preferSchemaTaggedStructScanner = makeNodeScanner(classDeclarationKinds)(
  ts.isClassDeclaration
)(portableDataTaggedClassMatches)
