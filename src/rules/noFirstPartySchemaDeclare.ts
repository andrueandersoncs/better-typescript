import { Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "./ruleCheck.js"
import { isFirstPartySymbol } from "./tsNode.js"
import { detection } from "../detectors/location.js"
import type { MakeDetection } from "../detectors/location.js"
import type { RuleCheck, RuleContext, Detection } from "../detectors/rule.js"

// --- Detection ---

const accessExpression: (access: ts.PropertyAccessExpression) => ts.Expression =
  Struct.get("expression")

const declarePropertyAccess = (
  call: ts.CallExpression
): Option.Option<ts.PropertyAccessExpression> =>
  Option.liftPredicate(ts.isPropertyAccessExpression)(call.expression)

const hasDeclareText = (access: ts.PropertyAccessExpression): boolean =>
  access.name.text === "declare"

const isDeclareCall = (node: ts.Node): node is ts.CallExpression =>
  pipe(
    Option.liftPredicate(ts.isCallExpression)(node),
    Option.flatMap(declarePropertyAccess),
    Option.exists(hasDeclareText)
  )

// --- Type analysis ---

const signatureTypePredicate =
  (checker: ts.TypeChecker) =>
  (signature: ts.Signature): Option.Option<ts.TypePredicate> => {
    const predicate = checker.getTypePredicateOfSignature(signature)

    return Option.fromNullable(predicate)
  }

const typePredicateAssertedType = (
  predicate: ts.TypePredicate
): Option.Option<ts.Type> => Option.fromNullable(predicate.type)

const predicateAssertedType =
  (checker: ts.TypeChecker) =>
  (predicate: ts.Expression): Option.Option<ts.Type> => {
    const type = checker.getTypeAtLocation(predicate)
    const signatures = type.getCallSignatures()

    return pipe(
      Option.fromNullable(signatures[0]),
      Option.flatMap(signatureTypePredicate(checker)),
      Option.flatMap(typePredicateAssertedType)
    )
  }

const typeSymbol = (type: ts.Type): Option.Option<ts.Symbol> => {
  const symbol = type.aliasSymbol ?? type.getSymbol()

  return Option.fromNullable(symbol)
}

const isFirstPartyDataStructure = (type: ts.Type): boolean => {
  const symbol = typeSymbol(type)
  const isFirstParty = Option.exists(symbol, isFirstPartySymbol)
  const isDataStructure = type.getCallSignatures().length === 0
  // A generic type parameter is a placeholder for a caller-supplied type, not a first-party data structure, even though its declaration sits in a project file.
  const isConcreteType = !type.isTypeParameter()

  return [isFirstParty, isDataStructure, isConcreteType].every(Boolean)
}

const symbolName: (symbol: ts.Symbol) => string = Struct.get("name")

const fallbackTypeName = (): string => "unknown"

// --- Rule match ---

const schemaDeclareHint =
  "Schema.declare is meant for integrating third-party types you do not control. " +
  "For types you own, define a proper Schema — for example class MyType extends " +
  'Schema.Class<MyType>("MyType")({ ... }) {} — which gives you validation, ' +
  "encoding, and decoding for free."

const schemaDeclareMatchSource =
  (match: MakeDetection) =>
  (call: ts.CallExpression) =>
  (assertedType: ts.Type): Detection => {
    const name = pipe(
      typeSymbol(assertedType),
      Option.map(symbolName),
      Option.getOrElse(fallbackTypeName)
    )
    const message = `Avoid Schema.declare for the first-party type "${name}".`

    return match({ node: call, message, hint: schemaDeclareHint })
  }

type AssertedType = (predicate: ts.Expression) => Option.Option<ts.Type>

const schemaDeclareMatchOption =
  (assertedType: AssertedType) =>
  (match: MakeDetection) =>
  (call: ts.CallExpression): Option.Option<Detection> =>
    pipe(
      Option.fromNullable(call.arguments[0]),
      Option.flatMap(assertedType),
      Option.filter(isFirstPartyDataStructure),
      Option.map(schemaDeclareMatchSource(match)(call))
    )

// The context stage runs once per file, so every partial below is shared by all Schema.declare calls the report wiring feeds to matches.
const schemaDeclareMatches = (context: RuleContext) => {
  const assertedType = predicateAssertedType(context.checker)
  const match = detection(context)
  const matchOption = schemaDeclareMatchOption(assertedType)(match)

  const matches = (call: ts.CallExpression): ReadonlyArray<Detection> => {
    const access = call.expression as ts.PropertyAccessExpression
    const object = accessExpression(access)
    if (!ts.isIdentifier(object)) return []
    const isOnSchema = object.text === "Schema"
    const isDeclareOnSchema = isOnSchema && call.arguments.length > 0
    const declareMatch = isDeclareOnSchema ? matchOption(call) : Option.none()

    return Option.toArray(declareMatch)
  }

  return matches
}

const check = nodeCheck([ts.SyntaxKind.CallExpression])(isDeclareCall)(
  schemaDeclareMatches
)

// --- Examples ---

export const noFirstPartySchemaDeclare: RuleCheck = check
