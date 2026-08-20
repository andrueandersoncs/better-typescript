import { Array, HashSet, Match, Option, Schema, flow, pipe } from "effect"
import * as ts from "typescript"
import { functionDefinitionScanner } from "../../internal/builtins/functionDefinitionScanner.js"
import { makeNodeMatch } from "../../internal/scanner/makeNodeMatch.js"
import { callableSemantics } from "../../internal/support/callableSemantics.js"
import type { CallableSemantics } from "../../internal/support/callableSemanticsClass.js"
import type { FunctionDefinition } from "../../internal/support/functionDefinition.js"
import { strictEqual } from "../../internal/equivalence.js"
import type { MatchContext } from "../../internal/scanner/matchContext.js"
import type { RoleWord } from "./roleWord.js"
import { roleWord } from "./roleWordValue.js"

// RequireCallableRoleNameConsistencyFact exists because its fields form one stable data contract used by the linter.
export const RequireCallableRoleNameConsistencyFact = Schema.Struct({
  nameText: Schema.String,
  role: Schema.String,
  expected: Schema.String
})

export interface RequireCallableRoleNameConsistencyFact extends Schema.Schema.Type<
  typeof RequireCallableRoleNameConsistencyFact
> {}

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
  (scan: FunctionDefinition): Option.Option<ts.Type> => {
    const typeOfParameter = (parameter: ts.Symbol) =>
      checker.getTypeOfSymbolAtLocation(parameter, scan)

    return pipe(
      checker.getSignatureFromDeclaration(scan),
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
  (scan: FunctionDefinition): boolean =>
    pipe(
      checker.getSignatureFromDeclaration(scan),
      Option.fromNullishOr,
      Option.map(returnTypeOfSignature(checker)),
      Option.exists(hasCallSignatures)
    )

const reducerAccumulatorCompatible =
  (checker: ts.TypeChecker) =>
  (semantics: CallableSemantics): boolean => {
    const accumulatorCompatible = (accumulator: ts.Type) => {
      const forward = checker.isTypeAssignableTo(semantics.result.returnType, accumulator)
      const backward = checker.isTypeAssignableTo(accumulator, semantics.result.returnType)
      const checks = Array.make(forward, backward)

      return Array.some(checks, Boolean)
    }

    return pipe(firstParameterType(checker)(semantics.scan), Option.exists(accumulatorCompatible))
  }

const roleExpectation =
  (checker: ts.TypeChecker) =>
  (role: RoleWord) =>
  (semantics: CallableSemantics): Option.Option<string> => {
    const hasInput = semantics.scan.parameters.length >= 1
    const hasProjection = Option.isSome(semantics.projection)
    const isConstruction = HashSet.has(semantics.roles, "construction")
    const isVoid = strictEqual("void")(semantics.result.shape)
    const isEffect = strictEqual("effect")(semantics.result.execution)
    const voidOrEffectFlags = Array.make(isVoid, isEffect)
    const isVoidOrEffect = Array.some(voidOrEffectFlags, Boolean)
    const isCallable = returnsCallable(checker)(semantics.scan)
    const isBoolean = strictEqual("boolean")(semantics.result.shape)
    const isNumber = strictEqual("number")(semantics.result.shape)
    const isNonVoid = semantics.result.shape !== "void"

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
        semantics.scan.parameters.length >= 2 && reducerAccumulatorCompatible(checker)(semantics)
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

      return makeNodeMatch(semantics.node, fact)
    })

  const matchFunctionDefinition = (scan: FunctionDefinition) =>
    pipe(semanticsFor(scan), Option.flatMap(matchWithSemantics), Option.toArray)

  return matchFunctionDefinition
}

export const requireCallableRoleNameConsistencyScanner = functionDefinitionScanner(matches)
