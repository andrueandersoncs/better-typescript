import { Array, Match as EffectMatch, Function, Match, Option, Struct, flow, pipe } from "effect"
import * as ts from "typescript"
import { strictEqual } from "../../equivalence.js"
import { fixedRuleMessage } from "../../rule/fixedRuleMessage.js"
import { makeRule } from "../../rule/makeRule.js"
import { acceptsNode } from "../../scanner/acceptsNode.js"
import { makeNodeScanner } from "../../scanner/makeNodeScanner.js"
import type { Match as ScannerMatch } from "../../scanner/match.js"
import type { MatchContext } from "../../scanner/matchContext.js"
import { foldAst } from "../../sources/foldAst.js"
import { callExpressionOf } from "../../support/callExpressionOf.js"
import { enclosingFunctionLike } from "../../support/effectApi/enclosingFunctionLike.js"
import { propertyAssignmentNamed } from "../../support/effectApi/propertyAssignments.js"
import { propertyNameText } from "../../support/propertyNameText.js"
import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"
import { callIsEffectApi } from "./callIsEffectApi.js"
import {
  callArgumentAt,
  effectApiCall,
  hasAncestor,
  isFunctionLikeExpression,
  typeSymbolName
} from "./effectApiFacts.js"
import { makeSubjectMatch, noSubjectMatches } from "./subjectMatch.js"

const objectLiteralArgument = flow(
  unwrapTransparentExpression,
  Option.liftPredicate(ts.isObjectLiteralExpression)
)

const lookupNames = Array.of("lookup")

const lookupPropertyAssignment = (object: ts.ObjectLiteralExpression) =>
  pipe(propertyAssignmentNamed(lookupNames)(object), Option.filter(ts.isPropertyAssignment))

const unwrappedPropertyInitializer = (property: ts.PropertyAssignment) =>
  unwrapTransparentExpression(property.initializer)

const lookupExpressionFromCacheOptions = (argument: ts.Expression) => {
  const unwrapped = unwrapTransparentExpression(argument)
  const asObject = objectLiteralArgument(argument)

  const fromObject = pipe(
    asObject,
    Option.flatMap(lookupPropertyAssignment),
    Option.map(unwrappedPropertyInitializer),
    Option.filter(isFunctionLikeExpression)
  )

  const asFunction = pipe(Option.some(unwrapped), Option.filter(isFunctionLikeExpression))

  return pipe(fromObject, Option.orElse(Function.constant(asFunction)))
}

const cacheMakeLookupFunction =
  (checker: ts.TypeChecker) =>
  (call: ts.CallExpression): Option.Option<ts.Expression> => {
    const matchesCacheMake = effectApiCall(checker)("Cache")(cacheMakeNames)

    if (!matchesCacheMake(call)) {
      return Option.none()
    }

    const options = pipe(
      EffectMatch.value(call.arguments.length),
      EffectMatch.when(1, () => callArgumentAt(0)(call)),
      EffectMatch.when(2, () => callArgumentAt(0)(call)),
      EffectMatch.orElse(() => Option.none())
    )

    return pipe(options, Option.flatMap(lookupExpressionFromCacheOptions))
  }

const nestedInsideCacheLookup = (checker: ts.TypeChecker) => (node: ts.Node) => {
  const visit = (current: ts.Node): boolean => {
    if (!ts.isCallExpression(current)) {
      return pipe(Option.fromNullishOr(current.parent), Option.exists(visit))
    }

    const lookupFunction = cacheMakeLookupFunction(checker)(current)

    if (Option.isSome(lookupFunction)) {
      const isInsideLookup = hasAncestor(strictEqual(lookupFunction.value))

      return isInsideLookup(node)
    }

    return pipe(Option.fromNullishOr(current.parent), Option.exists(visit))
  }

  return pipe(Option.fromNullishOr(node.parent), Option.exists(visit))
}

const emptyTypes = Array.empty<ts.Type>()

const identifierTextIsMap = flow(Struct.get<ts.Identifier, "text">("text"), strictEqual("Map"))

const isMapIdentifier = (expression: ts.Expression) =>
  pipe(Option.liftPredicate(ts.isIdentifier)(expression), Option.exists(identifierTextIsMap))

const newExpressionIsMap = (expression: ts.NewExpression) => isMapIdentifier(expression.expression)

const newMapExpression = (node: ts.Node) =>
  pipe(Option.liftPredicate(ts.isNewExpression)(node), Option.filter(newExpressionIsMap))

const layerAcquisitionNames = Array.make("effect", "effectDiscard", "effectContext")

const typeArgsOfTypeReference = (checker: ts.TypeChecker) => (type: ts.Type) => {
  const objectFlags = (type as ts.TypeReference).objectFlags ?? 0
  const isReference = (objectFlags & ts.ObjectFlags.Reference) !== 0

  return isReference ? checker.getTypeArguments(type as ts.TypeReference) : emptyTypes
}

const typeMentionsConstructor =
  (checker: ts.TypeChecker) =>
  (name: string) =>
  (type: ts.Type): boolean => {
    const visit =
      (seen: ReadonlyArray<ts.Type>) =>
      (current: ts.Type): boolean => {
        const previousEqualsCurrent = strictEqual(current)
        const alreadySeen = Array.some(seen, previousEqualsCurrent)
        const notSeen = strictEqual(false)(alreadySeen)
        const nextSeen = Array.append(seen, current)
        const symbolName = typeSymbolName(current)
        const matchesName = strictEqual(name)(symbolName)
        const unionParts = current.isUnionOrIntersection() ? current.types : emptyTypes
        const visitNext = visit(nextSeen)
        const unionMentions = Array.some(unionParts, visitNext)
        const typeArguments = typeArgsOfTypeReference(checker)(current)
        const argumentMentions = Array.some(typeArguments, visitNext)
        const rendered = checker.typeToString(current)
        const renderedMentions = rendered.includes(`${name}<`)
        const nestedFlags = Array.make(unionMentions, argumentMentions, renderedMentions)
        const hasStructural = Array.some(nestedFlags, Boolean)
        const matchFlags = Array.make(matchesName, hasStructural)
        const matches = Array.some(matchFlags, Boolean)
        const resultFlags = Array.make(notSeen, matches)

        return Array.every(resultFlags, Boolean)
      }

    return visit(emptyTypes)(type)
  }

const mapValueLooksPending = (context: MatchContext) => (expression: ts.NewExpression) => {
  const type = context.checker.getTypeAtLocation(expression)
  const mentions = typeMentionsConstructor(context.checker)
  const asPromise = mentions("Promise")(type)
  const asEffect = mentions("Effect")(type)

  return asPromise || asEffect
}

const cacheMakeNames = Array.make("make", "makeWith")

const sourceLooksLikeHandrolledTtlCache = (sourceText: string) => {
  const hasExpires = /\bexpires(?:At|On|In)?\b/u.test(sourceText)
  const hasDateNow = sourceText.includes("Date.now")
  const hasDelete = sourceText.includes(".delete(")
  const hasExpiryAndClock = hasExpires && hasDateNow

  return hasExpiryAndClock && hasDelete
}

const handrolledTtlCacheFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> =>
    pipe(
      newMapExpression(node),
      Option.filter(() => sourceLooksLikeHandrolledTtlCache(context.sourceFile.text)),
      Option.map(makeSubjectMatch("Map")),
      Option.toArray
    )

const variableMapValueLooksPending =
  (context: MatchContext) => (declaration: ts.VariableDeclaration) => {
    const mentions = typeMentionsConstructor(context.checker)

    const annotated = pipe(
      Option.fromNullishOr(declaration.type),
      Option.map((typeNode) => context.checker.getTypeFromTypeNode(typeNode)),
      Option.exists((type) => {
        const asPromise = mentions("Promise")(type)
        const asEffect = mentions("Effect")(type)

        return asPromise || asEffect
      })
    )

    const fromInitializer = pipe(
      Option.fromNullishOr(declaration.initializer),
      Option.filter(ts.isNewExpression),
      Option.exists(mapValueLooksPending(context))
    )

    return annotated || fromInitializer
  }

const initializerIsNewMap = (declaration: ts.VariableDeclaration) =>
  pipe(
    Option.fromNullishOr(declaration.initializer),
    Option.flatMap(newMapExpression),
    Option.isSome
  )

const inflightDedupeMapFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> => {
    const fromNew = pipe(
      newMapExpression(node),
      Option.filter(mapValueLooksPending(context)),
      Option.map(makeSubjectMatch("Map"))
    )

    const fromVariable = pipe(
      Option.liftPredicate(ts.isVariableDeclaration)(node),
      Option.filter(initializerIsNewMap),
      Option.filter(variableMapValueLooksPending(context)),
      Option.map(makeSubjectMatch("Map"))
    )

    const candidates = Array.make(fromNew, fromVariable)

    return Array.flatMap(candidates, Option.toArray)
  }

const provideNames = Array.make(
  "provide",
  "provideService",
  "provideServiceEffect",
  "provideContext"
)

const layerBuildNames = Array.of("build")

const isModuleScopeFunction = (fn: ts.FunctionLikeDeclaration) =>
  pipe(
    EffectMatch.value(fn.parent),
    EffectMatch.when(ts.isSourceFile, Function.constTrue),
    EffectMatch.when(ts.isModuleBlock, Function.constTrue),
    EffectMatch.when(ts.isVariableDeclaration, (declaration) => {
      const statement = declaration.parent?.parent
      const isVariableStatement = ts.isVariableStatement(statement)
      const isSourceFileParent = ts.isSourceFile(statement.parent)

      return isVariableStatement && isSourceFileParent
    }),
    EffectMatch.orElse(Function.constFalse)
  )

const cacheMakeIsPerRequest = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  pipe(
    enclosingFunctionLike(call),
    Option.exists((fn) => {
      const hasParameters = fn.parameters.length > 0
      const moduleScope = isModuleScopeFunction(fn)
      const nested = strictEqual(false)(moduleScope)
      const insideLookup = nestedInsideCacheLookup(checker)(call)
      const notLookup = strictEqual(false)(insideLookup)
      const hasParametersOrNested = hasParameters || nested

      return hasParametersOrNested && notLookup
    })
  )

const cachePerRequestFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> => {
    const matchesCacheMake = effectApiCall(context.checker)("Cache")(cacheMakeNames)

    return pipe(
      callExpressionOf(node),
      Option.filter(matchesCacheMake),
      Option.filter(cacheMakeIsPerRequest(context.checker)),
      Option.map(makeSubjectMatch("Cache.make")),
      Option.toArray
    )
  }

const scopedClientCacheFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> => {
    const matchesCall = effectApiCall(context.checker)
    const call = callExpressionOf(node)
    const isProvide = pipe(call, Option.exists(matchesCall("Effect")(provideNames)))
    const isLayerBuild = pipe(call, Option.exists(matchesCall("Layer")(layerBuildNames)))

    const isLayerAcquisition = pipe(
      call,
      Option.exists(matchesCall("Layer")(layerAcquisitionNames))
    )

    const provideOrBuild = isProvide || isLayerBuild
    const matches = provideOrBuild || isLayerAcquisition
    const nestedInLookup = nestedInsideCacheLookup(context.checker)(node)
    const matchedNestedFlags = Array.make(matches, nestedInLookup)
    const matchedNested = Array.every(matchedNestedFlags, Boolean)
    const shouldSkip = strictEqual(false)(matchedNested)

    if (shouldSkip) {
      return noSubjectMatches
    }

    const subject = node.getText(context.sourceFile)
    const finding = makeSubjectMatch(subject)(node)

    return Array.of(finding)
  }

const assignmentBindingName = (parent: ts.BinaryExpression) => {
  const isEquals = strictEqual(ts.SyntaxKind.EqualsToken)(parent.operatorToken.kind)

  if (!isEquals) {
    return Option.none<string>()
  }

  const left = unwrapTransparentExpression(parent.left)
  const isIdentifier = ts.isIdentifier(left)

  return isIdentifier ? Option.some(left.text) : Option.none()
}

const newMapBindingName = (node: ts.NewExpression) => {
  const expression = unwrapTransparentExpression(node.expression)
  const identifierMap = ts.isIdentifier(expression)
  const identifierText = identifierMap ? expression.text : ""
  const identifierIsMap = strictEqual("Map")(identifierText)
  const propertyMap = ts.isPropertyAccessExpression(expression)
  const propertyText = propertyMap ? expression.name.text : ""
  const propertyIsMap = strictEqual("Map")(propertyText)
  const mapIdentifier = Array.make(identifierMap, identifierIsMap)
  const mapProperty = Array.make(propertyMap, propertyIsMap)
  const isIdentifierMap = Array.every(mapIdentifier, Boolean)
  const isPropertyMap = Array.every(mapProperty, Boolean)
  const isMap = Array.make(isIdentifierMap, isPropertyMap)

  if (!Array.some(isMap, Boolean)) {
    return Option.none()
  }

  return pipe(
    Option.fromNullishOr(node.parent),
    Option.flatMap((parent) => {
      const variableName = pipe(
        Option.some(parent),
        Option.filter(ts.isVariableDeclaration),
        Option.map(Struct.get("name")),
        Option.filter(ts.isIdentifier),
        Option.map(Struct.get("text"))
      )

      if (Option.isSome(variableName)) {
        return variableName
      }

      if (ts.isBinaryExpression(parent)) {
        return assignmentBindingName(parent)
      }

      return pipe(
        Option.some(parent),
        Option.filter(ts.isPropertyAssignment),
        Option.map(Struct.get("name")),
        Option.flatMap(propertyNameText)
      )
    })
  )
}

const cacheNamePattern = /cache/i

const ttlFieldPattern = /^(expires?(At)?|expiry|ttl|deadline|validUntil|staleAt)$/i

const propertyAssignmentName = (assignment: ts.PropertyAssignment) => Option.some(assignment.name)

const shorthandPropertyAssignmentName = (assignment: ts.ShorthandPropertyAssignment) =>
  Option.some(assignment.name)

const propertyNameOption = (property: ts.ObjectLiteralElementLike) =>
  pipe(
    Match.value(property),
    Match.when(ts.isPropertyAssignment, propertyAssignmentName),
    Match.when(ts.isShorthandPropertyAssignment, shorthandPropertyAssignmentName),
    Match.orElse(() => Option.none())
  )

const propertyHasTtlName = (property: ts.ObjectLiteralElementLike) =>
  pipe(
    propertyNameOption(property),
    Option.flatMap(propertyNameText),
    Option.exists((name) => ttlFieldPattern.test(name))
  )

const objectLiteralHasTtlField = (expression: ts.Expression) => {
  const current = unwrapTransparentExpression(expression)
  const isObjectLiteral = ts.isObjectLiteralExpression(current)

  return isObjectLiteral ? Array.some(current.properties, propertyHasTtlName) : isObjectLiteral
}

const cachePreferenceCandidates =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> => {
    // Prefer soft Map-as-cache signals because handrolled-ttl-cache owns the complete TTL pattern.
    if (ts.isNewExpression(node)) {
      return pipe(
        newMapBindingName(node),
        Option.filter((name) => cacheNamePattern.test(name)),
        Option.map((name) => {
          const subject = `new Map (${name})`

          return makeSubjectMatch(subject)(node.expression)
        }),
        Option.map(Array.of),
        Option.getOrElse(Function.constant(noSubjectMatches))
      )
    }

    if (!ts.isCallExpression(node)) {
      return noSubjectMatches
    }

    const expression = unwrapTransparentExpression(node.expression)
    const isPropertyAccess = ts.isPropertyAccessExpression(expression)

    if (!isPropertyAccess) {
      return noSubjectMatches
    }

    const isSetName = strictEqual("set")(expression.name.text)

    if (!isSetName) {
      return noSubjectMatches
    }

    const valueOption = Option.fromNullishOr(node.arguments[1])
    const hasTtlValue = pipe(valueOption, Option.exists(objectLiteralHasTtlField))

    if (!hasTtlValue) {
      return noSubjectMatches
    }

    // Skip when Effect Cache is already constructed because the preference is satisfied.
    const usesEffectCacheStep = (found: boolean) => (current: ts.Node) => {
      const isCall = ts.isCallExpression(current)

      const isCacheMake =
        isCall && callIsEffectApi(context.checker)("Cache")(cacheMakeNames)(current)

      const signals = Array.make(found, isCacheMake)

      return Array.some(signals, Boolean)
    }

    const uncurriedReducer = Function.untupled(([found, current]: readonly [boolean, ts.Node]) =>
      usesEffectCacheStep(found)(current)
    )

    const usesEffectCache = foldAst(uncurriedReducer)(context.sourceFile)(false)

    if (usesEffectCache) {
      return noSubjectMatches
    }

    const finding = makeSubjectMatch("Map.set with TTL field")(node.expression)

    return Array.of(finding)
  }

const runtimeKinds = Array.make(
  ts.SyntaxKind.CallExpression,
  ts.SyntaxKind.PropertyAccessExpression,
  ts.SyntaxKind.ElementAccessExpression,
  ts.SyntaxKind.NewExpression,
  ts.SyntaxKind.VariableDeclaration,
  ts.SyntaxKind.BinaryExpression,
  ts.SyntaxKind.DeleteExpression,
  ts.SyntaxKind.WhileStatement,
  ts.SyntaxKind.ForStatement
)

const cacheKinds = Array.make(ts.SyntaxKind.CallExpression, ts.SyntaxKind.NewExpression)

const handrolledTtlCacheScanner = makeNodeScanner(runtimeKinds)(acceptsNode)(
  handrolledTtlCacheFindings
)

export const handrolledTtlCache = makeRule("handrolled-ttl-cache")(handrolledTtlCacheScanner)(
  fixedRuleMessage(
    "Avoid a hand-rolled TTL Map cache when Effect Cache fits.",
    "Use Cache.make or Cache.makeWith when its lifecycle and eviction semantics fit."
  )
)

const inflightDedupeMapScanner =
  makeNodeScanner(runtimeKinds)(acceptsNode)(inflightDedupeMapFindings)

export const inflightDedupeMap = makeRule("inflight-dedupe-map")(inflightDedupeMapScanner)(
  fixedRuleMessage(
    "Avoid a hand-rolled in-flight deduplication Map when Effect Cache fits.",
    "Cache.get shares an in-flight lookup for the same missing key."
  )
)

const cachePerRequestScanner = makeNodeScanner(runtimeKinds)(acceptsNode)(cachePerRequestFindings)

export const cachePerRequest = makeRule("cache-per-request")(cachePerRequestScanner)(
  fixedRuleMessage(
    "Construct Cache once in its owning layer or scope, not per request.",
    "Create the cache during layer acquisition and close over the shared handle."
  )
)

const scopedClientCacheScanner =
  makeNodeScanner(runtimeKinds)(acceptsNode)(scopedClientCacheFindings)

export const scopedClientCache = makeRule("scoped-client-cache")(scopedClientCacheScanner)(
  fixedRuleMessage(
    "Acquire clients outside Cache lookup functions and share them through a layer.",
    "Build the client once in the owning layer, then make lookup a plain call."
  )
)

const cachePreferenceScanner = makeNodeScanner(cacheKinds)(acceptsNode)(cachePreferenceCandidates)

export const cachePreference = makeRule("cache-preference")(cachePreferenceScanner)(
  fixedRuleMessage(
    "Prefer Effect Cache when its lifecycle semantics fit.",
    "Use Cache.make or Cache.makeWith instead of a hand-rolled cache."
  )
)
