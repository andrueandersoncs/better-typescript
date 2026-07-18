import { Array, HashSet, Match, Option, flow, pipe } from "effect"
import * as ts from "typescript"
import { makeDetection } from "@better-typescript/core/engine/check"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeCheck } from "../defineCheck.js"
import {
  callableSemantics,
  functionDefinitionKinds,
  type CallableSemantics
} from "./support/callableSemantics.js"
import { isFunctionDefinition, type FunctionDefinition } from "./support/tsNode.js"

// RoleWord is closed naming grammar because Match.exhaustive must reject unknown callable roles.
type RoleWord =
  | "accessor"
  | "callback"
  | "comparator"
  | "factory"
  | "function"
  | "handler"
  | "mapper"
  | "predicate"
  | "reducer"

const roleWord = (role: RoleWord) => role

const accessorRole = roleWord("accessor")
const callbackRole = roleWord("callback")
const comparatorRole = roleWord("comparator")
const factoryRole = roleWord("factory")
const functionRole = roleWord("function")
const handlerRole = roleWord("handler")
const mapperRole = roleWord("mapper")
const predicateRole = roleWord("predicate")
const reducerRole = roleWord("reducer")

const roleWords = HashSet.make(
  accessorRole,
  callbackRole,
  comparatorRole,
  factoryRole,
  functionRole,
  handlerRole,
  mapperRole,
  predicateRole,
  reducerRole
)

const isRoleWord = (word: string): word is RoleWord => HashSet.has(roleWords, word)

const claimedRole = (semantics: CallableSemantics) =>
  pipe(
    semantics.name.result,
    Option.filter(() => semantics.name.words.length > 1),
    Option.filter(isRoleWord)
  )

const firstParameterType =
  (checker: ts.TypeChecker) =>
  (definition: FunctionDefinition): Option.Option<ts.Type> =>
    pipe(
      checker.getSignatureFromDeclaration(definition),
      Option.fromNullishOr,
      Option.flatMap(flow((signature) => signature.getParameters(), Array.head)),
      Option.map((parameter) => checker.getTypeOfSymbolAtLocation(parameter, definition))
    )

const returnsCallable =
  (checker: ts.TypeChecker) =>
  (definition: FunctionDefinition): boolean =>
    pipe(
      checker.getSignatureFromDeclaration(definition),
      Option.fromNullishOr,
      Option.map((signature) => checker.getReturnTypeOfSignature(signature)),
      Option.exists((returnType) => returnType.getCallSignatures().length > 0)
    )

const reducerAccumulatorCompatible =
  (checker: ts.TypeChecker) =>
  (semantics: CallableSemantics): boolean =>
    pipe(
      firstParameterType(checker)(semantics.definition),
      Option.exists((accumulator) => {
        const returnType = semantics.result.returnType
        const forward = checker.isTypeAssignableTo(returnType, accumulator)
        const backward = checker.isTypeAssignableTo(accumulator, returnType)
        const checks = Array.make(forward, backward)

        return Array.some(checks, Boolean)
      })
    )

const roleExpectation =
  (checker: ts.TypeChecker) =>
  (role: RoleWord) =>
  (semantics: CallableSemantics): Option.Option<string> => {
    const shape = semantics.result.shape
    const execution = semantics.result.execution
    const parameters = semantics.definition.parameters.length
    const hasInput = parameters >= 1
    const hasProjection = Option.isSome(semantics.projection)
    const isConstruction = HashSet.has(semantics.roles, "construction")
    const isVoid = shape === "void"
    const isEffect = execution === "effect"
    const voidOrEffectFlags = Array.make(isVoid, isEffect)
    const isVoidOrEffect = Array.some(voidOrEffectFlags, Boolean)
    const isCallable = returnsCallable(checker)(semantics.definition)
    const isBoolean = shape === "boolean"
    const isNumber = shape === "number"
    const isNonVoid = shape !== "void"

    return pipe(
      Match.value(role),
      Match.when("predicate", () =>
        isBoolean ? Option.none() : Option.some("a boolean or type-predicate result")
      ),
      Match.when("mapper", () =>
        hasInput && isNonVoid
          ? Option.none()
          : Option.some("at least one input and a non-void mapped result")
      ),
      Match.when("reducer", () =>
        parameters >= 2 && reducerAccumulatorCompatible(checker)(semantics)
          ? Option.none()
          : Option.some("at least two inputs and a result compatible with its accumulator")
      ),
      Match.when("comparator", () =>
        isNumber ? Option.none() : Option.some("a numeric comparison result")
      ),
      Match.when("factory", () =>
        isConstruction ? Option.none() : Option.some("construction of a new value")
      ),
      Match.when("handler", () =>
        isVoidOrEffect ? Option.none() : Option.some("a void or Effectful side-effect result")
      ),
      Match.when("accessor", () =>
        hasProjection ? Option.none() : Option.some("a projected property path from its input")
      ),
      Match.when("callback", () => (isCallable ? Option.none() : Option.some("a callable result"))),
      Match.when("function", () => (isCallable ? Option.none() : Option.some("a callable result"))),
      Match.exhaustive
    )
  }

const roleNameMatches = (context: CheckContext) => {
  const match = makeDetection(context)
  const semanticsFor = callableSemantics(context)
  const expectationFor = roleExpectation(context.checker)

  const matches = (definition: FunctionDefinition): ReadonlyArray<Detection> =>
    pipe(
      semanticsFor(definition),
      Option.flatMap((semantics) =>
        Option.gen(function* () {
          const role = yield* claimedRole(semantics)
          const expected = yield* expectationFor(role)(semantics)

          return match({
            node: semantics.node,
            message: `${semantics.name.text} claims the ${role} role, but does not provide ${expected}.`,
            hint:
              `Rename away from the ${role} role noun, or change the signature and body so the ` +
              `${role} contract holds.`
          })
        })
      ),
      Option.toArray
    )

  return matches
}

export const requireCallableRoleNameConsistency = makeCheck(
  "require-callable-role-name-consistency",
  functionDefinitionKinds,
  isFunctionDefinition,
  roleNameMatches
)
