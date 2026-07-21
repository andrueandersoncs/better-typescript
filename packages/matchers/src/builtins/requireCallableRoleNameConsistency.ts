import { Array, flow, HashSet, Match, Option, pipe, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { nodeMatch } from "../matcher/data.js"
import {
  callableSemantics,
  functionDefinitionKinds,
  type CallableSemantics
} from "../support/callableSemantics.js"
import { isFunctionDefinition, type FunctionDefinition } from "../support/tsNode.js"
import { strictEqual } from "../equivalence.js"
import type { MatchContext } from "../matcher/data.js"

// RequireCallableRoleNameConsistencyFact pairs role and word because naming advice needs both.
export const RequireCallableRoleNameConsistencyFact = Schema.Struct({
  nameText: Schema.String,
  role: Schema.String,
  expected: Schema.String
})

export interface RequireCallableRoleNameConsistencyFact extends Schema.Schema.Type<
  typeof RequireCallableRoleNameConsistencyFact
> {}

// RoleWord is a local syntax union because matchers need one narrowed node shape.
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

const signatureParameters = (signature: ts.Signature) => signature.getParameters()
const headSignatureParameter = flow(signatureParameters, Array.head)

const firstParameterType =
  (checker: ts.TypeChecker) =>
  (definition: FunctionDefinition): Option.Option<ts.Type> => {
    const typeOfParameter = (parameter: ts.Symbol) =>
      checker.getTypeOfSymbolAtLocation(parameter, definition)

    return pipe(
      checker.getSignatureFromDeclaration(definition),
      Option.fromNullishOr,
      Option.flatMap(headSignatureParameter),
      Option.map(typeOfParameter)
    )
  }

const returnTypeOfSignature = (checker: ts.TypeChecker) => (signature: ts.Signature) =>
  checker.getReturnTypeOfSignature(signature)

const hasCallSignatures = (returnType: ts.Type) => returnType.getCallSignatures().length > 0

const returnsCallable =
  (checker: ts.TypeChecker) =>
  (definition: FunctionDefinition): boolean =>
    pipe(
      checker.getSignatureFromDeclaration(definition),
      Option.fromNullishOr,
      Option.map(returnTypeOfSignature(checker)),
      Option.exists(hasCallSignatures)
    )

const reducerAccumulatorCompatible =
  (checker: ts.TypeChecker) =>
  (semantics: CallableSemantics): boolean => {
    const accumulatorCompatible = (accumulator: ts.Type) => {
      const returnType = semantics.result.returnType
      const forward = checker.isTypeAssignableTo(returnType, accumulator)
      const backward = checker.isTypeAssignableTo(accumulator, returnType)
      const checks = Array.make(forward, backward)

      return Array.some(checks, Boolean)
    }

    return pipe(
      firstParameterType(checker)(semantics.definition),
      Option.exists(accumulatorCompatible)
    )
  }

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
    const isVoid = strictEqual("void")(shape)
    const isEffect = strictEqual("effect")(execution)
    const voidOrEffectFlags = Array.make(isVoid, isEffect)
    const isVoidOrEffect = Array.some(voidOrEffectFlags, Boolean)
    const isCallable = returnsCallable(checker)(semantics.definition)
    const isBoolean = strictEqual("boolean")(shape)
    const isNumber = strictEqual("number")(shape)
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

const matches = (context: MatchContext) => {
  const semanticsFor = callableSemantics(context)
  const expectationFor = roleExpectation(context.checker)

  const matchWithSemantics = (semantics: CallableSemantics) =>
    Option.gen(function* () {
      const role = yield* claimedRole(semantics)
      const expected = yield* expectationFor(role)(semantics)

      const fact = RequireCallableRoleNameConsistencyFact.make({
        nameText: semantics.name.text,
        role,
        expected
      })

      return nodeMatch(semantics.node, fact)
    })

  const matchFunctionDefinition = (definition: FunctionDefinition) =>
    pipe(semanticsFor(definition), Option.flatMap(matchWithSemantics), Option.toArray)

  return matchFunctionDefinition
}

export const requireCallableRoleNameConsistencyMatcher =
  nodeMatcher(functionDefinitionKinds)(isFunctionDefinition)(matches)
