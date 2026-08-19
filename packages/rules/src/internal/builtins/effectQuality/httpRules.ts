import {
  Array,
  Data,
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
import { makeNodeScanner } from "../../scanner/makeNodeScanner.js"
import type { Match as ScannerMatch } from "../../scanner/match.js"
import type { MatchContext } from "../../scanner/matchContext.js"
import { foldAst } from "../../sources/foldAst.js"
import { callExpressionOf } from "../../support/callExpressionOf.js"
import { constantNoneString } from "../../support/constantNoneString.js"
import { conventionalArchitectureRoleOf } from "../../support/conventionalArchitectureRoleOf.js"
import { enclosingFunctionLike } from "../../support/effectApi/enclosingFunctionLike.js"
import { hasEffectCallAncestor } from "../../support/effectApi/hasEffectCallAncestor.js"
import { importedEffectApiAt } from "../../support/effectApi/importedEffectApiAt.js"
import type { ImportedMember } from "../../support/effectApi/importedMember.js"
import { importedMemberAt } from "../../support/effectApi/importedMemberAt.js"
import { propertyAssignmentNamed } from "../../support/effectApi/propertyAssignments.js"
import { isFunctionInitializer } from "../../support/isFunctionInitializer.js"
import { optionNodeText } from "../../support/optionNodeText.js"
import { toRelativeFileName } from "../../support/paths.js"
import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"
import { unwrapCallee } from "../../support/unwrapCallee.js"
import { memberLastName } from "./memberLastName.js"
import { callIsResponseJson, schemaDecodeNames } from "./responseJson.js"
import { makeSubjectMatch, noSubjectMatches } from "./subjectMatch.js"

// BodyStatusWalk tracks body-before-status order because that order is the rule subject.
class BodyStatusWalk extends Data.Class<{
  readonly sawBodyRead: boolean
  readonly sawStatusBefore: boolean
}> {}

const callIsImportedApi =
  (predicate: (member: ImportedMember) => boolean) =>
  (checker: ts.TypeChecker) =>
  (expression: ts.Expression) => {
    const unwrapped = unwrapTransparentExpression(expression)
    const callee = unwrapCallee(unwrapped)
    const member = importedMemberAt(checker)(callee)

    return Option.exists(member, predicate)
  }

const httpNamespaceNames = Array.make(
  "HttpClient",
  "HttpClientResponse",
  "HttpClientRequest",
  "FetchHttpClient"
)

const segmentIsHttpNamespace = (segment: string) => Array.contains(httpNamespaceNames, segment)

const moduleIsEffectHttp = (moduleSpecifier: string) => {
  const exactUnstable = strictEqual("effect/unstable/http")(moduleSpecifier)
  const nestedUnstable = moduleSpecifier.startsWith("effect/unstable/http/")
  const platformExact = strictEqual("@effect/platform")(moduleSpecifier)
  const platformNested = moduleSpecifier.startsWith("@effect/platform/")
  const effectHttpNested = moduleSpecifier.startsWith("effect/Http")

  const flags = Array.make(
    exactUnstable,
    nestedUnstable,
    platformExact,
    platformNested,
    effectHttpNested
  )

  return Array.some(flags, Boolean)
}

const pathMatchesHttpNamespaceApi = (path: ReadonlyArray<string>) => {
  const hasNamespace = Array.some(path, segmentIsHttpNamespace)
  const singleMemberPath = strictEqual(1)(path.length)
  const pathFlags = Array.make(hasNamespace, singleMemberPath)

  return Array.some(pathFlags, Boolean)
}

const barrelPathMatchesHttpNamespace = (path: ReadonlyArray<string>) => {
  const path0 = Array.get(path, 0)
  const path1 = Array.get(path, 1)
  const path2 = Array.get(path, 2)
  const barrelNamespace = pipe(path0, Option.exists(segmentIsHttpNamespace))
  const unstableNamespace = pipe(path2, Option.exists(segmentIsHttpNamespace))
  const hasUnstable = pipe(path0, Option.contains("unstable"))
  const hasHttp = pipe(path1, Option.contains("http"))
  const unstablePathFlags = Array.make(hasUnstable, hasHttp, unstableNamespace)
  const unstablePath = Array.every(unstablePathFlags, Boolean)
  const barrelFlags = Array.make(barrelNamespace, unstablePath)

  return Array.some(barrelFlags, Boolean)
}

const memberIsHttpNamespaceApi = (names: ReadonlyArray<string>) => (member: ImportedMember) => {
  const last = memberLastName(member)
  const nameMatches = Array.contains(names, last)
  const fromHttpModule = moduleIsEffectHttp(member.moduleSpecifier)
  const fromEffectBarrel = strictEqual("effect")(member.moduleSpecifier)
  const moduleOkFlags = Array.make(fromHttpModule, fromEffectBarrel)
  const moduleOk = Array.some(moduleOkFlags, Boolean)
  const nonEffectBarrel = member.moduleSpecifier !== "effect"
  const nonEffectHttpFlags = Array.make(fromHttpModule, nonEffectBarrel)
  const nonEffectHttpModule = Array.every(nonEffectHttpFlags, Boolean)

  const pathMatches = nonEffectHttpModule
    ? pathMatchesHttpNamespaceApi(member.path)
    : barrelPathMatchesHttpNamespace(member.path)

  const flags = Array.make(nameMatches, moduleOk, pathMatches)

  return Array.every(flags, Boolean)
}

const httpResponseSchemaNames = Array.make("schemaBodyJson", "schemaJson", "schemaNoBody")

const callIsHttpResponseSchema = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  callIsImportedApi(memberIsHttpNamespaceApi(httpResponseSchemaNames))(checker)(call.expression)

const moduleIsEffectSchema = (moduleSpecifier: string) => {
  const fromBarrel = strictEqual("effect")(moduleSpecifier)
  const fromSchema = strictEqual("effect/Schema")(moduleSpecifier)
  const fromSchemaNested = moduleSpecifier.startsWith("effect/Schema/")
  const flags = Array.make(fromBarrel, fromSchema, fromSchemaNested)

  return Array.some(flags, Boolean)
}

const memberIsSchemaDecodeApi = (member: ImportedMember) => {
  const schemaModule = moduleIsEffectSchema(member.moduleSpecifier)
  const last = memberLastName(member)
  const nameMatches = Array.contains(schemaDecodeNames, last)
  const fromEffectBarrel = strictEqual("effect")(member.moduleSpecifier)
  const schemaPathHead = Array.get(member.path, 0)
  const barrelSchemaPath = pipe(schemaPathHead, Option.contains("Schema"))
  const pathOk = fromEffectBarrel ? barrelSchemaPath : true
  const flags = Array.make(schemaModule, nameMatches, pathOk)

  return Array.every(flags, Boolean)
}

const callIsSchemaDecode = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  callIsImportedApi(memberIsSchemaDecodeApi)(checker)(call.expression)

const statusPropertyNames = Array.make("status", "ok", "statusText")

const literalIsStatusProperty = (literal: ts.StringLiteralLike) =>
  Array.contains(statusPropertyNames, literal.text)

const propertyAccessNameIsStatus = (access: ts.PropertyAccessExpression) =>
  Array.contains(statusPropertyNames, access.name.text)

const prefixUnaryAccessesStatus = (unary: ts.PrefixUnaryExpression) =>
  expressionAccessesStatus(unary.operand)

const postfixUnaryAccessesStatus = (unary: ts.PostfixUnaryExpression) =>
  expressionAccessesStatus(unary.operand)

const parenthesizedAccessesStatus = (parenthesized: ts.ParenthesizedExpression) =>
  expressionAccessesStatus(parenthesized.expression)

const asExpressionAccessesStatus = (asExpression: ts.AsExpression) =>
  expressionAccessesStatus(asExpression.expression)

const satisfiesExpressionAccessesStatus = (satisfiesExpression: ts.SatisfiesExpression) =>
  expressionAccessesStatus(satisfiesExpression.expression)

const statusAccessOfExpression = (current: ts.Expression): boolean =>
  pipe(
    Match.value(current),
    Match.when(ts.isPropertyAccessExpression, (access) => {
      const nameHit = propertyAccessNameIsStatus(access)
      const nested = expressionAccessesStatus(access.expression)
      const flags = Array.make(nameHit, nested)

      return Array.some(flags, Boolean)
    }),
    Match.when(ts.isElementAccessExpression, (access) => {
      const argument = unwrapTransparentExpression(access.argumentExpression)

      const literalStatus = pipe(
        Option.liftPredicate(ts.isStringLiteralLike)(argument),
        Option.exists(literalIsStatusProperty)
      )

      const nested = expressionAccessesStatus(access.expression)
      const flags = Array.make(literalStatus, nested)

      return Array.some(flags, Boolean)
    }),
    Match.when(ts.isCallExpression, (call) => {
      const callee = unwrapTransparentExpression(call.expression)
      const propertyAccess = Option.liftPredicate(ts.isPropertyAccessExpression)(callee)

      return pipe(propertyAccess, Option.exists(propertyAccessNameIsStatus))
    }),
    Match.when(ts.isBinaryExpression, (binary) => {
      const left = expressionAccessesStatus(binary.left)
      const right = expressionAccessesStatus(binary.right)
      const flags = Array.make(left, right)

      return Array.some(flags, Boolean)
    }),
    Match.when(ts.isPrefixUnaryExpression, prefixUnaryAccessesStatus),
    Match.when(ts.isPostfixUnaryExpression, postfixUnaryAccessesStatus),
    Match.when(ts.isParenthesizedExpression, parenthesizedAccessesStatus),
    Match.when(ts.isAsExpression, asExpressionAccessesStatus),
    Match.when(ts.isSatisfiesExpression, satisfiesExpressionAccessesStatus),
    Match.when(ts.isConditionalExpression, (conditional) => {
      const condition = expressionAccessesStatus(conditional.condition)
      const whenTrue = expressionAccessesStatus(conditional.whenTrue)
      const whenFalse = expressionAccessesStatus(conditional.whenFalse)
      const flags = Array.make(condition, whenTrue, whenFalse)

      return Array.some(flags, Boolean)
    }),
    Match.orElse(Function.constFalse)
  )

const expressionAccessesStatus = (expression: ts.Expression): boolean =>
  pipe(expression, unwrapTransparentExpression, statusAccessOfExpression)

const expressionReferencesName =
  (name: string) =>
  (expression: ts.Expression): boolean => {
    const current = unwrapTransparentExpression(expression)
    const recur = expressionReferencesName(name)
    const identifierIsName = flow(Struct.get<ts.Identifier, "text">("text"), strictEqual(name))

    const propertyAccessReferencesName = (access: ts.PropertyAccessExpression) =>
      recur(access.expression)

    const elementAccessReferencesName = (access: ts.ElementAccessExpression) =>
      recur(access.expression)

    const asExpressionReferencesName = (asExpression: ts.AsExpression) =>
      recur(asExpression.expression)

    const satisfiesExpressionReferencesName = (satisfiesExpression: ts.SatisfiesExpression) =>
      recur(satisfiesExpression.expression)

    const parenthesizedReferencesName = (parenthesized: ts.ParenthesizedExpression) =>
      recur(parenthesized.expression)

    const nonNullReferencesName = (nonNull: ts.NonNullExpression) => recur(nonNull.expression)

    const callArgumentsReferenceName = (call: ts.CallExpression) =>
      Array.some(call.arguments, recur)

    return pipe(
      Match.value(current),
      Match.when(ts.isIdentifier, identifierIsName),
      Match.when(ts.isPropertyAccessExpression, propertyAccessReferencesName),
      Match.when(ts.isElementAccessExpression, elementAccessReferencesName),
      Match.when(ts.isAsExpression, asExpressionReferencesName),
      Match.when(ts.isSatisfiesExpression, satisfiesExpressionReferencesName),
      Match.when(ts.isParenthesizedExpression, parenthesizedReferencesName),
      Match.when(ts.isNonNullExpression, nonNullReferencesName),
      Match.when(ts.isConditionalExpression, (conditional) => {
        const whenTrue = recur(conditional.whenTrue)
        const whenFalse = recur(conditional.whenFalse)
        const flags = Array.make(whenTrue, whenFalse)

        return Array.some(flags, Boolean)
      }),
      Match.when(ts.isBinaryExpression, (binary) => {
        const left = recur(binary.left)
        const right = recur(binary.right)
        const flags = Array.make(left, right)

        return Array.some(flags, Boolean)
      }),
      Match.when(ts.isCallExpression, callArgumentsReferenceName),
      Match.orElse(Function.constFalse)
    )
  }

const bodyContainsAny =
  (predicate: (node: ts.Node) => boolean) => (found: boolean) => (current: ts.Node) =>
    found || predicate(current)

const functionBodyContains = (predicate: (node: ts.Node) => boolean) => (body: ts.ConciseBody) => {
  const step = bodyContainsAny(predicate)

  const uncurriedStep = Function.untupled(([found, current]: readonly [boolean, ts.Node]) =>
    step(found)(current)
  )

  const scan = Function.flip(foldAst(uncurriedStep))(false)

  return scan(body)
}

const functionBodyOf = (fn: ts.FunctionLikeDeclaration) => Option.fromNullishOr(fn.body)

const globalFetchReceivers = Array.make("globalThis", "window", "self")

const expressionIsFetchCallee = (expression: ts.Expression) => {
  const current = unwrapTransparentExpression(expression)

  if (ts.isIdentifier(current)) {
    return strictEqual("fetch")(current.text)
  }

  const propertyAccess = Option.liftPredicate(ts.isPropertyAccessExpression)(current)

  const accessIsNamedFetch = (access: ts.PropertyAccessExpression) =>
    strictEqual("fetch")(access.name.text)

  const unwrapAccessExpression = (access: ts.PropertyAccessExpression) =>
    unwrapTransparentExpression(access.expression)

  const receiverIsGlobalFetch = (receiver: ts.Identifier) =>
    Array.contains(globalFetchReceivers, receiver.text)

  return pipe(
    propertyAccess,
    Option.filter(accessIsNamedFetch),
    Option.map(unwrapAccessExpression),
    Option.filter(ts.isIdentifier),
    Option.exists(receiverIsGlobalFetch)
  )
}

const callIsFetch = (call: ts.CallExpression) => expressionIsFetchCallee(call.expression)

const httpClientRequestNames = Array.make(
  "execute",
  "get",
  "head",
  "post",
  "put",
  "patch",
  "del",
  "options"
)

const httpStatusClassifyNames = Array.make("filterStatusOk", "filterStatus", "matchStatus")

const responseBodyNames = Array.make("json", "text", "arrayBuffer", "blob", "formData", "bytes")

const propertyAccessIsResponseBody = (access: ts.PropertyAccessExpression) =>
  Array.contains(responseBodyNames, access.name.text)

const callIsResponseBodyRead = (call: ts.CallExpression) => {
  const callee = unwrapTransparentExpression(call.expression)
  const propertyAccess = Option.liftPredicate(ts.isPropertyAccessExpression)(callee)

  return pipe(propertyAccess, Option.exists(propertyAccessIsResponseBody))
}

const bindingNameText = (name: ts.BindingName) =>
  pipe(
    Match.value(name),
    Match.when(ts.isIdentifier, optionNodeText),
    Match.orElse(constantNoneString)
  )

const signalParameterName = (callback: ts.ArrowFunction | ts.FunctionExpression) =>
  pipe(
    Array.head(callback.parameters),
    Option.map(Struct.get("name")),
    Option.flatMap(bindingNameText)
  )

const tryPromiseNames = Array.of("tryPromise")

const tryPropertyNames = Array.of("try")

const signalPropertyNames = Array.of("signal")

const tryPromiseBody = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const isTryPromise = importedEffectApiAt(checker)("Effect")(tryPromiseNames)(call.expression)

  if (!isTryPromise) {
    return Option.none()
  }

  return pipe(
    Array.head(call.arguments),
    Option.map(unwrapTransparentExpression),
    Option.flatMap((current) => {
      const asFunction = Option.liftPredicate(isFunctionInitializer)(current)

      const tryAssignmentFromObject = (object: ts.ObjectLiteralExpression) =>
        pipe(
          propertyAssignmentNamed(tryPropertyNames)(object),
          Option.filter(ts.isPropertyAssignment)
        )

      const fromObject = pipe(
        Option.liftPredicate(ts.isObjectLiteralExpression)(current),
        Option.flatMap(tryAssignmentFromObject),
        Option.map(Struct.get("initializer")),
        Option.map(unwrapTransparentExpression),
        Option.filter(isFunctionInitializer)
      )

      return pipe(asFunction, Option.orElse(Function.constant(fromObject)))
    })
  )
}

const shorthandPropertyPassesSignal =
  (signalName: string) => (property: ts.ObjectLiteralElementLike) =>
    pipe(
      Option.liftPredicate(ts.isShorthandPropertyAssignment)(property),
      Option.exists((shorthand) => {
        const namedSignal = strictEqual("signal")(shorthand.name.text)
        const signalParamIsSignal = strictEqual("signal")(signalName)
        const flags = Array.make(namedSignal, signalParamIsSignal)

        return Array.every(flags, Boolean)
      })
    )

const spreadPassesSignal =
  (signalName: string) =>
  (property: ts.ObjectLiteralElementLike): boolean =>
    pipe(
      Option.liftPredicate(ts.isSpreadAssignment)(property),
      Option.exists((spreadAssignment) => {
        const spread = unwrapTransparentExpression(spreadAssignment.expression)
        const nestedObject = Option.liftPredicate(ts.isObjectLiteralExpression)(spread)

        return pipe(
          nestedObject,
          Option.map(objectPassesSignal(signalName)),
          Option.getOrElse(() => expressionReferencesName(signalName)(spreadAssignment.expression))
        )
      })
    )

const objectPassesSignal =
  (signalName: string) =>
  (object: ts.ObjectLiteralExpression): boolean => {
    const assignmentInitializerReferencesSignal = (assignment: ts.ObjectLiteralElementLike) =>
      ts.isPropertyAssignment(assignment) &&
      expressionReferencesName(signalName)(assignment.initializer)

    const direct = pipe(
      propertyAssignmentNamed(signalPropertyNames)(object),
      Option.exists(assignmentInitializerReferencesSignal)
    )

    const shorthand = Array.some(object.properties, shorthandPropertyPassesSignal(signalName))
    const spread = Array.some(object.properties, spreadPassesSignal(signalName))
    const flags = Array.make(direct, shorthand, spread)

    return Array.some(flags, Boolean)
  }

const initPassesSignal = (signalName: string) => (init: ts.Expression) =>
  pipe(
    Option.liftPredicate(ts.isObjectLiteralExpression)(init),
    Option.map(objectPassesSignal(signalName)),
    Option.getOrElse(() => expressionReferencesName(signalName)(init))
  )

const fetchInitPassesSignal = (signalName: string) => (call: ts.CallExpression) =>
  pipe(
    Option.fromNullishOr(call.arguments[1]),
    Option.map(unwrapTransparentExpression),
    Option.exists(initPassesSignal(signalName))
  )

const fetchPassesSignal = (signalName: string) => (found: boolean) => (current: ts.Node) => {
  const asCall = callExpressionOf(current)

  const passes = pipe(
    asCall,
    Option.filter(callIsFetch),
    Option.exists(fetchInitPassesSignal(signalName))
  )

  return found || passes
}

const containsFetch = (found: boolean) => (current: ts.Node) => {
  const asCall = callExpressionOf(current)
  const isFetch = Option.exists(asCall, callIsFetch)

  return found || isFetch
}

const uncurriedContainsFetch = Function.untupled(([found, current]: readonly [boolean, ts.Node]) =>
  containsFetch(found)(current)
)

const callbackContainsFetch = Function.flip(foldAst(uncurriedContainsFetch))(false)

const callbackPassesSignalToFetch = (signalName: string) => {
  const passesSignal = fetchPassesSignal(signalName)

  const uncurriedPassesSignal = Function.untupled(([found, current]: readonly [boolean, ts.Node]) =>
    passesSignal(found)(current)
  )

  const scan = Function.flip(foldAst(uncurriedPassesSignal))(false)

  return scan
}

const signalMissingOnFetch =
  (callback: ts.ArrowFunction | ts.FunctionExpression) => (signalName: string) => {
    const passes = callbackPassesSignalToFetch(signalName)(callback)

    return !passes
  }

const findingsForMissingSignal =
  (call: ts.CallExpression) => (callback: ts.ArrowFunction | ts.FunctionExpression) => {
    const subject = pipe(
      signalParameterName(callback),
      Option.getOrElse(Function.constant("fetch"))
    )

    const finding = makeSubjectMatch(subject)(call)

    return Array.of(finding)
  }

const rawFetchAbortFindings = (context: MatchContext) => (node: ts.Node) => {
  const callbackMissingSignalOnFetch = (callback: ts.ArrowFunction | ts.FunctionExpression) =>
    pipe(
      signalParameterName(callback),
      Option.match({
        onNone: Function.constTrue,
        onSome: signalMissingOnFetch(callback)
      })
    )

  const findingsFromTryPromiseCall = (call: ts.CallExpression) =>
    pipe(
      tryPromiseBody(context.checker)(call),
      Option.filter(callbackContainsFetch),
      Option.filter(callbackMissingSignalOnFetch),
      Option.map(findingsForMissingSignal(call))
    )

  return pipe(
    callExpressionOf(node),
    Option.flatMap(findingsFromTryPromiseCall),
    Option.getOrElse(Function.constant(noSubjectMatches))
  )
}

const isSchemaOrHttpResponseValidation = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const schemaDecode = callIsSchemaDecode(checker)(call)
  const httpSchema = callIsHttpResponseSchema(checker)(call)
  const flags = Array.make(schemaDecode, httpSchema)

  return Array.some(flags, Boolean)
}

const callIsArgumentOfValidation =
  (validates: (call: ts.CallExpression) => boolean) =>
  (call: ts.CallExpression) =>
  (candidate: ts.CallExpression) => {
    const argumentEqualsCall = strictEqual(call)
    const isArgument = Array.some(candidate.arguments, argumentEqualsCall)
    const isValidation = validates(candidate)
    const flags = Array.make(isArgument, isValidation)

    return Array.every(flags, Boolean)
  }

const nodeIsValidationCall =
  (validates: (call: ts.CallExpression) => boolean) => (current: ts.Node) => {
    const asCall = callExpressionOf(current)

    return Option.exists(asCall, validates)
  }

const responseBodyHasNearbyValidation = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const parentCall = callExpressionOf(call.parent)
  const validates = isSchemaOrHttpResponseValidation(checker)
  const directParentValidation = Option.exists(parentCall, validates)

  const argumentOfValidation = Option.exists(
    parentCall,
    callIsArgumentOfValidation(validates)(call)
  )

  // Function-scope decode is enough because yield* response.json() may decode later in the body.
  const validationInBody = nodeIsValidationCall(validates)
  const bodyContainsValidation = functionBodyContains(validationInBody)
  const functionBodyOf = (fn: ts.FunctionLikeDeclaration) => Option.fromNullishOr(fn.body)

  const functionScopeValidation = pipe(
    enclosingFunctionLike(call),
    Option.flatMap(functionBodyOf),
    Option.exists(bodyContainsValidation)
  )

  const flags = Array.make(directParentValidation, argumentOfValidation, functionScopeValidation)

  return Array.some(flags, Boolean)
}

const findingsForUnvalidatedResponse = flow(makeSubjectMatch("response.json"), Array.of)

const httpResponseValidationFindings = (context: MatchContext) => (node: ts.Node) => {
  const hasNearbyValidation = responseBodyHasNearbyValidation(context.checker)
  const isHttpSchema = callIsHttpResponseSchema(context.checker)
  const isSchemaDecode = callIsSchemaDecode(context.checker)

  return pipe(
    callExpressionOf(node),
    Option.filter(callIsResponseJson),
    Option.filter(Predicate.not(hasNearbyValidation)),
    Option.filter(Predicate.not(isHttpSchema)),
    Option.filter(Predicate.not(isSchemaDecode)),
    Option.map(findingsForUnvalidatedResponse),
    Option.getOrElse(Function.constant(noSubjectMatches))
  )
}

const memberSubject = (member: ImportedMember) => {
  const path = Array.join(member.path, ".")

  return strictEqual(0)(path.length) ? member.moduleSpecifier : `${member.moduleSpecifier}:${path}`
}

const propertyAccessIsHttpClientRequest = (access: ts.PropertyAccessExpression) =>
  Array.contains(httpClientRequestNames, access.name.text)

const callIsHttpClientRequest = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const importedPredicate = memberIsHttpNamespaceApi(httpClientRequestNames)
  const importedLookup = callIsImportedApi(importedPredicate)(checker)
  const imported = importedLookup(call.expression)
  const callee = unwrapTransparentExpression(call.expression)
  const propertyAccess = Option.liftPredicate(ts.isPropertyAccessExpression)(callee)
  const propertyNamed = pipe(propertyAccess, Option.exists(propertyAccessIsHttpClientRequest))
  const flags = Array.make(imported, propertyNamed)

  return Array.some(flags, Boolean)
}

const binaryAccessesStatus = (binary: ts.BinaryExpression) => {
  const left = expressionAccessesStatus(binary.left)
  const right = expressionAccessesStatus(binary.right)
  const flags = Array.make(left, right)

  return Array.some(flags, Boolean)
}

const propertyAccessIsStatus = (access: ts.PropertyAccessExpression) =>
  Array.contains(statusPropertyNames, access.name.text)

const ifStatementAccessesStatus = (statement: ts.IfStatement) =>
  expressionAccessesStatus(statement.expression)

const conditionalAccessesStatus = (conditional: ts.ConditionalExpression) =>
  expressionAccessesStatus(conditional.condition)

const nodeClassifiesStatus =
  (checker: ts.TypeChecker) =>
  (node: ts.Node): boolean => {
    const isStatusClassify = callIsImportedApi(memberIsHttpNamespaceApi(httpStatusClassifyNames))(
      checker
    )

    const callExpressionIsStatusClassify = (call: ts.CallExpression) =>
      isStatusClassify(call.expression)

    return pipe(
      EffectMatch.value(node),
      EffectMatch.when(ts.isCallExpression, callExpressionIsStatusClassify),
      EffectMatch.when(ts.isPropertyAccessExpression, propertyAccessIsStatus),
      EffectMatch.when(ts.isBinaryExpression, binaryAccessesStatus),
      EffectMatch.when(ts.isIfStatement, ifStatementAccessesStatus),
      EffectMatch.when(ts.isConditionalExpression, conditionalAccessesStatus),
      EffectMatch.orElse(Function.constFalse)
    )
  }

const walkBodyStatus =
  (classify: (node: ts.Node) => boolean) =>
  (bodyRead: ts.CallExpression) =>
  (state: BodyStatusWalk) =>
  (current: ts.Node): BodyStatusWalk => {
    if (state.sawBodyRead) {
      return state
    }

    if (strictEqual(bodyRead)(current)) {
      return new BodyStatusWalk({
        sawBodyRead: true,
        sawStatusBefore: state.sawStatusBefore
      })
    }

    if (classify(current)) {
      return new BodyStatusWalk({
        sawBodyRead: false,
        sawStatusBefore: true
      })
    }

    return state
  }

const bodyReadPrecedesStatus =
  (checker: ts.TypeChecker) => (bodyRead: ts.CallExpression) => (body: ts.ConciseBody) => {
    const classify = nodeClassifiesStatus(checker)
    const step = walkBodyStatus(classify)(bodyRead)

    const uncurriedStep = Function.untupled(
      ([state, current]: readonly [BodyStatusWalk, ts.Node]) => step(state)(current)
    )

    const initial = new BodyStatusWalk({
      sawBodyRead: false,
      sawStatusBefore: false
    })

    const result = foldAst(uncurriedStep)(body)(initial)
    const noStatusBefore = !result.sawStatusBefore
    const flags = Array.make(result.sawBodyRead, noStatusBefore)

    return Array.every(flags, Boolean)
  }

const callLooksHttpRelated =
  (checker: ts.TypeChecker) =>
  (call: ts.CallExpression): boolean => {
    const isStatusClassify = callIsImportedApi(memberIsHttpNamespaceApi(httpStatusClassifyNames))(
      checker
    )

    const clientRequest = callIsHttpClientRequest(checker)(call)
    const statusClassify = isStatusClassify(call.expression)
    const bodyRead = callIsResponseBodyRead(call)
    const flags = Array.make(clientRequest, statusClassify, bodyRead)

    return Array.some(flags, Boolean)
  }

const nodeIsHttpRelatedCall = (checker: ts.TypeChecker) => (current: ts.Node) => {
  const asCall = callExpressionOf(current)

  return Option.exists(asCall, callLooksHttpRelated(checker))
}

const isBodyDecodeCall = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const bodyRead = callIsResponseBodyRead(call)
  const schemaDecode = callIsSchemaDecode(checker)(call)
  const httpSchema = callIsHttpResponseSchema(checker)(call)
  const flags = Array.make(bodyRead, schemaDecode, httpSchema)

  return Array.some(flags, Boolean)
}

const bodyLooksHttpRelated = (checker: ts.TypeChecker) => (node: ts.CallExpression) => {
  const rawBody = callIsResponseBodyRead(node)
  const httpSchema = callIsHttpResponseSchema(checker)(node)
  const schemaDecode = callIsSchemaDecode(checker)(node)
  const relatedCall = nodeIsHttpRelatedCall(checker)
  const bodyContainsRelated = functionBodyContains(relatedCall)

  const hasHttpClient = pipe(
    enclosingFunctionLike(node),
    Option.flatMap(functionBodyOf),
    Option.exists(bodyContainsRelated)
  )

  const schemaWithHttpFlags = Array.make(schemaDecode, hasHttpClient)
  const schemaWithHttp = Array.every(schemaWithHttpFlags, Boolean)
  const flags = Array.make(rawBody, httpSchema, schemaWithHttp)

  return Array.some(flags, Boolean)
}

const bodyReadSubject = (node: ts.CallExpression) => {
  const expression = unwrapTransparentExpression(node.expression)
  const access = Option.liftPredicate(ts.isPropertyAccessExpression)(expression)

  return pipe(
    access,
    Option.map((property) => `response.${property.name.text}`),
    Option.getOrElse(Function.constant("response body"))
  )
}

const importedDecodeSubject = (context: MatchContext) => (node: ts.CallExpression) => {
  const callee = unwrapCallee(node.expression)
  const member = importedMemberAt(context.checker)(callee)

  return pipe(
    member,
    Option.map(memberSubject),
    Option.getOrElse(Function.constant("response decode"))
  )
}

const statusDecodeSubject = (context: MatchContext) => (node: ts.CallExpression) =>
  callIsResponseBodyRead(node) ? bodyReadSubject(node) : importedDecodeSubject(context)(node)

const bodyReadPrecedesInFunction =
  (precedesStatus: (call: ts.CallExpression) => (body: ts.ConciseBody) => boolean) =>
  (call: ts.CallExpression) =>
    pipe(
      enclosingFunctionLike(call),
      Option.flatMap(functionBodyOf),
      Option.exists(precedesStatus(call))
    )

const findingsForCall =
  (subjectOf: (call: ts.CallExpression) => string) => (call: ts.CallExpression) => {
    const subject = subjectOf(call)
    const finding = makeSubjectMatch(subject)(call)

    return Array.of(finding)
  }

const httpStatusDecodeOrderFindings = (context: MatchContext) => (node: ts.Node) => {
  const isBodyDecode = isBodyDecodeCall(context.checker)
  const precedesStatus = bodyReadPrecedesStatus(context.checker)
  const looksHttpRelated = bodyLooksHttpRelated(context.checker)
  const subjectOf = statusDecodeSubject(context)
  const precedesInFunction = bodyReadPrecedesInFunction(precedesStatus)
  // Report only HTTP-looking body reads because raw response.* or HttpClient schema indicate HTTP
  const toFindings = findingsForCall(subjectOf)

  return pipe(
    callExpressionOf(node),
    Option.filter(isBodyDecode),
    Option.filter(precedesInFunction),
    Option.filter(looksHttpRelated),
    Option.map(toFindings),
    Option.getOrElse(Function.constant(noSubjectMatches))
  )
}

const isAmbientFetchCallee = (checker: ts.TypeChecker) => (expression: ts.Expression) => {
  const current = unwrapTransparentExpression(expression)
  const isIdentifier = ts.isIdentifier(current)
  const identifierText = isIdentifier ? current.text : ""
  const isFetchName = strictEqual("fetch")(identifierText)
  const isFetchIdentifier = Array.make(isIdentifier, isFetchName)
  const isFetch = Array.every(isFetchIdentifier, Boolean)

  if (!isFetch) {
    return isFetch
  }

  return pipe(
    checker.getSymbolAtLocation(current),
    Option.fromNullishOr,
    Option.exists((symbol) => {
      const declarations = symbol.declarations ?? Array.empty()

      const hasAmbientDeclaration = Array.some(declarations, (declaration) => {
        const file = declaration.getSourceFile()
        const isDomFile = file.fileName.includes("lib.dom")
        const isDomLibParts = Array.make(file.isDeclarationFile, isDomFile)
        const isDomLib = Array.every(isDomLibParts, Boolean)
        const hasFunctionFlag = (symbol.flags & ts.SymbolFlags.Function) !== 0
        const hasNoDeclarations = strictEqual(0)(declarations.length)
        const globalParts = Array.make(hasFunctionFlag, hasNoDeclarations)
        const isGlobalFunction = Array.every(globalParts, Boolean)
        const ambientConditions = Array.make(isDomLib, isGlobalFunction)

        return Array.some(ambientConditions, Boolean)
      })

      // Prefer ambient fetch because local bare bindings still represent the global API.
      const imported = importedMemberAt(checker)(current)
      const isUnimported = Option.isNone(imported)
      const ambientOrUnimported = Array.make(isUnimported, hasAmbientDeclaration)

      return Array.some(ambientOrUnimported, Boolean)
    })
  )
}

const isBareFetchCall = (checker: ts.TypeChecker) =>
  flow(Struct.get<ts.CallExpression, "expression">("expression"), isAmbientFetchCallee(checker))

const isFetchHttpClientMember = (member: ImportedMember) => {
  const direct = strictEqual("effect/unstable/http/FetchHttpClient")(member.moduleSpecifier)
  const isHttpBarrel = strictEqual("effect/unstable/http")(member.moduleSpecifier)
  const pathHead = Array.head(member.path)
  const pathHeadIsFetchHttpClient = pipe(pathHead, Option.contains("FetchHttpClient"))
  const httpBarrelParts = Array.make(isHttpBarrel, pathHeadIsFetchHttpClient)
  const httpBarrel = Array.every(httpBarrelParts, Boolean)
  const path0 = Array.get(member.path, 0)
  const path1 = Array.get(member.path, 1)
  const path2 = Array.get(member.path, 2)
  const effectPath0 = pipe(path0, Option.contains("unstable"))
  const effectPath1 = pipe(path1, Option.contains("http"))
  const effectPath2 = pipe(path2, Option.contains("FetchHttpClient"))
  const effectModule = strictEqual("effect")(member.moduleSpecifier)
  const effectParts = Array.make(effectModule, effectPath0, effectPath1, effectPath2)
  const effectBarrel = Array.every(effectParts, Boolean)
  const sources = Array.make(direct, httpBarrel, effectBarrel)

  return Array.some(sources, Boolean)
}

const isHttpClientMember = (member: ImportedMember) => {
  const direct = strictEqual("effect/unstable/http/HttpClient")(member.moduleSpecifier)
  const isHttpBarrel = strictEqual("effect/unstable/http")(member.moduleSpecifier)
  const pathHead = Array.head(member.path)
  const pathHeadIsHttpClient = pipe(pathHead, Option.contains("HttpClient"))
  const httpBarrelParts = Array.make(isHttpBarrel, pathHeadIsHttpClient)
  const httpBarrel = Array.every(httpBarrelParts, Boolean)
  const path0 = Array.get(member.path, 0)
  const path1 = Array.get(member.path, 1)
  const path2 = Array.get(member.path, 2)
  const unstablePath0 = pipe(path0, Option.contains("http"))
  const unstablePath1 = pipe(path1, Option.contains("HttpClient"))
  const unstableModule = strictEqual("effect/unstable")(member.moduleSpecifier)
  const unstableParts = Array.make(unstableModule, unstablePath0, unstablePath1)
  const unstableBarrel = Array.every(unstableParts, Boolean)
  const effectPath0 = pipe(path0, Option.contains("unstable"))
  const effectPath1 = pipe(path1, Option.contains("http"))
  const effectPath2 = pipe(path2, Option.contains("HttpClient"))
  const effectModule = strictEqual("effect")(member.moduleSpecifier)
  const effectParts = Array.make(effectModule, effectPath0, effectPath1, effectPath2)
  const effectBarrel = Array.every(effectParts, Boolean)
  const sources = Array.make(direct, httpBarrel, unstableBarrel, effectBarrel)

  return Array.some(sources, Boolean)
}

const sourceFileIsAdapter = (context: MatchContext) => {
  const relativePath = toRelativeFileName(context.projectRoot)(context.sourceFile.fileName)
  const role = conventionalArchitectureRoleOf(relativePath)

  return pipe(role, Option.exists(strictEqual("adapter")))
}

const rawFetchOutsideAdapterCandidates =
  (context: MatchContext) =>
  (node: ts.CallExpression): ReadonlyArray<ScannerMatch<string>> => {
    const bareFetch = isBareFetchCall(context.checker)(node)
    const adapter = sourceFileIsAdapter(context)
    const insideTryPromise = hasEffectCallAncestor(context.checker)("Effect")(tryPromiseNames)(node)
    const ignoreRawFetchReasons = Array.make(!bareFetch, adapter, insideTryPromise)
    const shouldIgnoreRawFetch = Array.some(ignoreRawFetchReasons, Boolean)

    if (shouldIgnoreRawFetch) {
      return noSubjectMatches
    }

    const finding = makeSubjectMatch("fetch")(node.expression)

    return Array.of(finding)
  }

const httpClientPreferenceCandidates =
  (context: MatchContext) =>
  (node: ts.CallExpression): ReadonlyArray<ScannerMatch<string>> => {
    const bareFetch = isBareFetchCall(context.checker)(node)
    const insideTryPromise = hasEffectCallAncestor(context.checker)("Effect")(tryPromiseNames)(node)
    const ignoreHttpClientPreferenceReasons = Array.make(!bareFetch, !insideTryPromise)
    const shouldIgnoreHttpClientPreference = Array.some(ignoreHttpClientPreferenceReasons, Boolean)

    if (shouldIgnoreHttpClientPreference) {
      return noSubjectMatches
    }

    // Quiet when the file already wires HttpClient because preference is already met.
    const memberUsesHttpClient = (member: ImportedMember) => {
      const http = isHttpClientMember(member)
      const fetchHttp = isFetchHttpClientMember(member)
      const members = Array.make(http, fetchHttp)

      return Array.some(members, Boolean)
    }

    const expressionUsesHttpClient = (expression: ts.Expression) =>
      pipe(importedMemberAt(context.checker)(expression), Option.exists(memberUsesHttpClient))

    const currentUsesHttpClient = (current: ts.Node) =>
      pipe(
        EffectMatch.value(current),
        EffectMatch.when(ts.isIdentifier, expressionUsesHttpClient),
        EffectMatch.when(ts.isPropertyAccessExpression, expressionUsesHttpClient),
        EffectMatch.orElse(Function.constFalse)
      )

    const fileUsesHttpClientStep = (found: boolean) => (current: ts.Node) => {
      const usesHttpClient = currentUsesHttpClient(current)
      const signals = Array.make(found, usesHttpClient)

      return Array.some(signals, Boolean)
    }

    const uncurriedStep = Function.untupled(([found, current]: readonly [boolean, ts.Node]) =>
      fileUsesHttpClientStep(found)(current)
    )

    const fileUsesHttpClient = foldAst(uncurriedStep)(context.sourceFile)(false)

    if (fileUsesHttpClient) {
      return noSubjectMatches
    }

    const finding = makeSubjectMatch("fetch")(node.expression)

    return Array.of(finding)
  }

const callKinds = Array.of(ts.SyntaxKind.CallExpression)

const rawFetchAbortSignalScanner = makeNodeScanner(callKinds)(ts.isCallExpression)(
  rawFetchAbortFindings
)

export const rawFetchAbortSignal = makeRule("raw-fetch-abort-signal")(rawFetchAbortSignalScanner)(
  fixedRuleMessage(
    "Pass Effect.tryPromise's AbortSignal to raw fetch.",
    "Accept the tryPromise signal and pass it as fetch's init.signal."
  )
)

const httpResponseValidationScanner = makeNodeScanner(callKinds)(ts.isCallExpression)(
  httpResponseValidationFindings
)

export const httpResponseValidation = makeRule("http-response-validation")(
  httpResponseValidationScanner
)(
  fixedRuleMessage(
    "Decode unknown HTTP response data with Schema at the adapter boundary.",
    "Apply Schema.decodeUnknownEffect or an HttpClient response schema decoder."
  )
)

const httpStatusDecodeOrderScanner = makeNodeScanner(callKinds)(ts.isCallExpression)(
  httpStatusDecodeOrderFindings
)

export const httpStatusDecodeOrder = makeRule("http-status-decode-order")(
  httpStatusDecodeOrderScanner
)(
  fixedRuleMessage(
    "Classify HTTP status before decoding a successful response body.",
    "Apply filterStatusOk or an equivalent response classifier first."
  )
)

const rawFetchOutsideAdapterScanner = makeNodeScanner(callKinds)(ts.isCallExpression)(
  rawFetchOutsideAdapterCandidates
)

export const rawFetchOutsideAdapter = makeRule("raw-fetch-outside-adapter")(
  rawFetchOutsideAdapterScanner
)(
  fixedRuleMessage(
    "Keep raw fetch in an adapter.",
    "Move raw fetch behind a named adapter boundary or use Effect HttpClient."
  )
)

const httpClientPreferenceScanner = makeNodeScanner(callKinds)(ts.isCallExpression)(
  httpClientPreferenceCandidates
)

export const httpClientPreference = makeRule("http-client-preference")(httpClientPreferenceScanner)(
  fixedRuleMessage(
    "Prefer Effect HttpClient for HTTP adapters.",
    "Use Effect's typed HTTP client unless a documented raw-fetch exception applies."
  )
)
