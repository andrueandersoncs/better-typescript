import { Array, Function, Option, Schema, Struct, pipe } from "effect"
import * as ts from "typescript"
import { strictEqual } from "../equivalence.js"
import { makeNodeScanner } from "../scanner/makeNodeScanner.js"
import { foldAst } from "../sources/foldAst.js"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"
import type { MatchContext } from "../scanner/matchContext.js"
import { isContextServiceAt } from "./contextServiceAt.js"
import { isContextServiceDeclaration } from "./contextServiceDeclaration.js"
import { importedEffectApiAt } from "../support/effectApi/importedEffectApiAt.js"
import { isExactForwarder } from "./isExactForwarder.js"
import { symbolOptionAt } from "./symbolOptionAt.js"
import { unwrapCallee } from "../support/unwrapCallee.js"
import { unwrapExpression } from "../support/unwrapExpression.js"
import { unwrapTransparentExpression } from "../support/transparentWrapper.js"

// NoTrivialEffectFnFact is empty because the forwarding shape needs no extra payload.
export const NoTrivialEffectFnFact = Schema.Struct({})

const noTrivialEffectFnFact = NoTrivialEffectFnFact.make({})

const variableDeclarationKinds = Array.of(ts.SyntaxKind.VariableDeclaration)
const effectFnNames = Array.of("fn")

export interface NoTrivialEffectFnFact extends Schema.Schema.Type<typeof NoTrivialEffectFnFact> {}

const isEffectFnCall = (context: MatchContext) => (call: ts.CallExpression) =>
  importedEffectApiAt(context.checker)("Effect")(effectFnNames)(call.expression)

const hasSingleYieldedReturn = (generator: ts.FunctionExpression) => {
  const statement = pipe(Array.head(generator.body.statements), Option.filter(ts.isReturnStatement))

  const hasAsterisk = (expression: ts.YieldExpression) =>
    pipe(expression.asteriskToken, Option.fromNullishOr, Option.isSome)

  const yielded = pipe(
    statement,
    Option.map(Struct.get<ts.ReturnStatement, "expression">("expression")),
    Option.flatMap(Option.fromNullishOr),
    Option.map(unwrapExpression),
    Option.filter(ts.isYieldExpression),
    Option.filter(hasAsterisk)
  )

  const generatorHasAsterisk = pipe(generator.asteriskToken, Option.fromNullishOr, Option.isSome)
  const hasOneStatement = strictEqual(1)(generator.body.statements.length)
  const hasYieldedReturn = Option.isSome(yielded)
  const checks = Array.make(generatorHasAsterisk, hasOneStatement, hasYieldedReturn)

  return Array.every(checks, Boolean)
}

const effectFnGenerator = (context: MatchContext) => (declaration: ts.VariableDeclaration) =>
  Option.gen(function* () {
    const initializer = yield* pipe(
      Option.fromNullishOr(declaration.initializer),
      Option.filter(ts.isCallExpression)
    )

    yield* pipe(
      Option.liftPredicate(ts.isCallExpression)(initializer.expression),
      Option.filter(isEffectFnCall(context))
    )

    yield* pipe(initializer.arguments.length, Option.liftPredicate(strictEqual(1)))

    return yield* pipe(
      Array.head(initializer.arguments),
      Option.filter(ts.isFunctionExpression),
      Option.filter(hasSingleYieldedReturn)
    )
  })

const effectFnLayerSucceedNames = Array.of("succeed")

const callProvidesEffectFnServiceObject =
  (context: MatchContext) =>
  (object: ts.ObjectLiteralExpression) =>
  (serviceArgumentIndex: number) =>
  (objectArgumentIndex: number) =>
  (serviceCall: ts.CallExpression) =>
  (objectCall: ts.CallExpression) => {
    const callee = unwrapCallee(serviceCall.expression)

    const isLayerSucceed = importedEffectApiAt(context.checker)("Layer")(effectFnLayerSucceedNames)(
      callee
    )

    const service = Array.get(serviceCall.arguments, serviceArgumentIndex)
    const implementation = Array.get(objectCall.arguments, objectArgumentIndex)
    const implementationIsObject = pipe(implementation, Option.exists(strictEqual(object)))
    const expressionIsService = isContextServiceAt(context)
    const serviceIsContextService = pipe(service, Option.exists(expressionIsService))
    const hasServiceImplementation = implementationIsObject && serviceIsContextService

    return isLayerSucceed && hasServiceImplementation
  }

const effectFnServiceOfCall = (context: MatchContext) => (call: ts.CallExpression) => {
  const accessNameIsOf = (access: ts.PropertyAccessExpression) =>
    strictEqual("of")(access.name.text)

  const accessReceiverIsService = Function.flow(
    Struct.get<ts.PropertyAccessExpression, "expression">("expression"),
    isContextServiceAt(context)
  )

  return pipe(
    unwrapTransparentExpression(call.expression),
    Option.liftPredicate(ts.isPropertyAccessExpression),
    Option.filter(accessNameIsOf),
    Option.exists(accessReceiverIsService)
  )
}

const objectIsEffectFnServiceImplementation =
  (context: MatchContext) => (object: ts.ObjectLiteralExpression) => {
    const parentCall = pipe(object.parent, Option.liftPredicate(ts.isCallExpression))
    const isServiceOfCall = pipe(parentCall, Option.exists(effectFnServiceOfCall(context)))

    const directCallProvidesObject = (call: ts.CallExpression) =>
      callProvidesEffectFnServiceObject(context)(object)(0)(1)(call)(call)

    const isDirectLayerImplementation = pipe(parentCall, Option.exists(directCallProvidesObject))

    const objectCallContainsObject = (call: ts.CallExpression) =>
      pipe(Array.head(call.arguments), Option.exists(strictEqual(object)))

    const serviceCallFromObjectCall = (call: ts.CallExpression) =>
      Option.liftPredicate(ts.isCallExpression)(call.expression)

    const isCurriedLayerImplementation = pipe(
      Option.gen(function* () {
        const objectCall = yield* pipe(parentCall, Option.filter(objectCallContainsObject))
        const serviceCall = yield* serviceCallFromObjectCall(objectCall)

        return callProvidesEffectFnServiceObject(context)(object)(0)(0)(serviceCall)(objectCall)
      }),
      Option.exists(Boolean)
    )

    const isLayerImplementation = isDirectLayerImplementation || isCurriedLayerImplementation

    return isServiceOfCall || isLayerImplementation
  }

const identifierIsServiceProperty = (context: MatchContext) => (identifier: ts.Identifier) => {
  const shorthand = ts.isShorthandPropertyAssignment(identifier.parent)

  const assigned = pipe(
    Option.liftPredicate(ts.isPropertyAssignment)(identifier.parent),
    Option.map(Struct.get<ts.PropertyAssignment, "initializer">("initializer")),
    Option.exists(strictEqual(identifier))
  )

  const isImplementationProperty = shorthand || assigned

  const implementationObject = pipe(
    identifier.parent.parent,
    Option.liftPredicate(ts.isObjectLiteralExpression),
    Option.filter(objectIsEffectFnServiceImplementation(context))
  )

  return isImplementationProperty && Option.isSome(implementationObject)
}

const isContextServiceOperation =
  (context: MatchContext) => (declaration: ts.VariableDeclaration) => {
    const nestedInService = pipe(
      ts.findAncestor(declaration, ts.isClassDeclaration),
      Option.fromNullishOr,
      Option.exists(isContextServiceDeclaration(context))
    )

    const declarationSymbol = pipe(
      Option.liftPredicate(ts.isIdentifier)(declaration.name),
      Option.flatMap(symbolOptionAt(context.checker))
    )

    const referencedAsServiceProperty = pipe(
      declarationSymbol,
      Option.exists((symbol) => {
        const matchesServiceProperty = (node: ts.Node) => (found: boolean) => {
          const sameSymbol = pipe(
            Option.liftPredicate(ts.isIdentifier)(node),
            Option.flatMap(symbolOptionAt(context.checker)),
            Option.exists(strictEqual(symbol))
          )

          const serviceProperty = pipe(
            Option.liftPredicate(ts.isIdentifier)(node),
            Option.exists(identifierIsServiceProperty(context))
          )

          const matchingProperty = sameSymbol && serviceProperty

          return found || matchingProperty
        }

        const matchesServicePropertyFold = Function.untupled(
          ([found, node]: readonly [boolean, ts.Node]) => matchesServiceProperty(node)(found)
        )

        return foldAst(matchesServicePropertyFold)(context.sourceFile)(false)
      })
    )

    return nestedInService || referencedAsServiceProperty
  }

const makeTrivialEffectFnMatch = (declaration: ts.VariableDeclaration) =>
  makeNodeMatch(declaration.name, noTrivialEffectFnFact)

const makeTrivialEffectFnMatches =
  (context: MatchContext) => (declaration: ts.VariableDeclaration) => {
    const match = makeTrivialEffectFnMatch(declaration)

    return pipe(
      effectFnGenerator(context)(declaration),
      Option.filter(isExactForwarder),
      Option.filter(() => !isContextServiceOperation(context)(declaration)),
      Option.as(match),
      Option.toArray
    )
  }

export const noTrivialEffectFnScanner = makeNodeScanner(variableDeclarationKinds)(
  ts.isVariableDeclaration
)(makeTrivialEffectFnMatches)
