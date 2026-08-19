import { Array, Function, Option, Predicate, Schema, Struct, Tuple, pipe } from "effect"
import * as ts from "typescript"
import { makeNodeScanner } from "../scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"
import type { Match } from "../scanner/match.js"
import type { MatchContext } from "../scanner/matchContext.js"
import { isFunctionInitializer } from "../support/isFunctionInitializer.js"
import { unwrapTransparentExpression } from "../support/transparentWrapper.js"
import { unaryAdapter } from "../support/unaryAdapter.js"
import { foldAst } from "../sources/foldAst.js"
import { strictEqual } from "../equivalence.js"
import { identifierText } from "./identifierText.js"
import { unwrapTowerCarrier } from "./unwrapTowerCarrier.js"
import { importedEffectApiAt } from "../support/effectApi/importedEffectApiAt.js"
import { effectApiMember } from "../support/effectApi/effectApiMember.js"
import { importedMemberAt } from "../support/effectApi/importedMemberAt.js"
import type { ImportedMember } from "../support/effectApi/importedMember.js"
import { isSeedIdentifier } from "./isSeedIdentifier.js"
import { isPipeCallee } from "./isPipeCallee.js"
import { referencesToSymbol } from "./referencesToSymbol.js"
import { symbolOptionAt } from "./symbolOptionAt.js"

interface NamedVariableDeclaration extends ts.VariableDeclaration {
  readonly name: ts.Identifier
}

const blockKind = Schema.Literal("block")
const adapterKind = Schema.Literal("adapter")
const effectPipelineKind = Schema.Literal("effect-pipeline")

// PreferFunctionCompositionBlockFact exists because its fields form one stable data contract used by the linter.
export const PreferFunctionCompositionBlockFact = Schema.Struct({
  kind: blockKind
})

export interface PreferFunctionCompositionBlockFact extends Schema.Schema.Type<
  typeof PreferFunctionCompositionBlockFact
> {}

// PreferFunctionCompositionAdapterFact exists because its fields form one stable data contract used by the linter.
export const PreferFunctionCompositionAdapterFact = Schema.Struct({
  kind: adapterKind,
  typeText: Schema.String,
  propertyName: Schema.String,
  partialText: Schema.String
})

export interface PreferFunctionCompositionAdapterFact extends Schema.Schema.Type<
  typeof PreferFunctionCompositionAdapterFact
> {}

// PreferFunctionCompositionEffectPipelineFact exists because its fields form one stable data contract used by the linter.
export const PreferFunctionCompositionEffectPipelineFact = Schema.Struct({
  kind: effectPipelineKind
})

export interface PreferFunctionCompositionEffectPipelineFact extends Schema.Schema.Type<
  typeof PreferFunctionCompositionEffectPipelineFact
> {}

const functionCompositionMembers = Array.make(
  PreferFunctionCompositionBlockFact,
  PreferFunctionCompositionAdapterFact,
  PreferFunctionCompositionEffectPipelineFact
)

// PreferFunctionCompositionFact exists because its fields form one stable data contract used by the linter.
export const PreferFunctionCompositionFact = Schema.Union(functionCompositionMembers)

export type PreferFunctionCompositionFact = Schema.Schema.Type<typeof PreferFunctionCompositionFact>

const hasOneArgument = Function.flow(
  Struct.get<ts.CallExpression, "arguments">("arguments"),
  Array.length,
  strictEqual(1)
)

const hasNoOptionalChain = Function.flow(
  Struct.get<ts.PropertyAccessExpression, "questionDotToken">("questionDotToken"),
  Option.fromNullishOr,
  Option.isNone
)

const propertyComposedAdapter = (node: ts.Node) =>
  pipe(
    unaryAdapter(node),
    Option.flatMap((adapter) => {
      const result = Option.gen(function* () {
        const outer = Tuple.get(adapter, 3)
        const call = yield* Option.liftPredicate(ts.isCallExpression)(outer)
        yield* Option.liftPredicate(hasOneArgument)(call)

        const argument = yield* pipe(call.arguments, Array.head)
        const parameterName = Tuple.get(adapter, 2).text

        const access = yield* pipe(
          argument,
          unwrapTransparentExpression,
          Option.liftPredicate(ts.isPropertyAccessExpression),
          Option.filter(hasNoOptionalChain),
          Option.filter(
            Function.flow(
              Struct.get<ts.PropertyAccessExpression, "expression">("expression"),
              Option.liftPredicate(ts.isIdentifier),
              Option.map(identifierText),
              Option.exists(strictEqual(parameterName))
            )
          )
        )

        const partial = yield* pipe(
          call.expression,
          unwrapTransparentExpression,
          Option.liftPredicate(ts.isCallExpression),
          Option.filter(hasOneArgument),
          Option.filter(
            Function.flow(
              Struct.get<ts.CallExpression, "expression">("expression"),
              ts.isIdentifier
            )
          )
        )

        return Tuple.make(adapter, access, partial)
      })

      return result
    })
  )

const callFirstArgument = (call: ts.CallExpression) => Option.fromNullishOr(call.arguments[0])

const isUnaryCallTowerOver =
  (name: string) =>
  (expression: ts.Expression): boolean => {
    const carrier = unwrapTowerCarrier(expression)
    const seedMatch = isSeedIdentifier(name)(carrier)
    const callOption = Option.liftPredicate(ts.isCallExpression)(carrier)

    const callIsPipe = Function.flow(
      Struct.get<ts.CallExpression, "expression">("expression"),
      isPipeCallee
    )

    const callIsNotPipe = Predicate.not(callIsPipe)
    const callHasOneArgument = (call: ts.CallExpression) => strictEqual(1)(call.arguments.length)

    const pipeTower = pipe(
      callOption,
      Option.filter(callIsPipe),
      Option.flatMap(callFirstArgument),
      Option.exists(isUnaryCallTowerOver(name))
    )

    const unaryTower = pipe(
      callOption,
      Option.filter(callHasOneArgument),
      Option.filter(callIsNotPipe),
      Option.flatMap(callFirstArgument),
      Option.exists(isUnaryCallTowerOver(name))
    )

    const conditions = Array.make(seedMatch, pipeTower, unaryTower)
    return Array.some(conditions, Boolean)
  }

const runPromiseNames = Array.of("runPromise")

const arrowFunctionKinds = Array.of(ts.SyntaxKind.ArrowFunction)

const matches = (context: MatchContext) => {
  const hasTypePredicate = (arrowFunction: ts.ArrowFunction) => {
    const type = context.checker.getTypeAtLocation(arrowFunction)
    const callSignatures = type.getCallSignatures()

    const isTypePredicate = (signature: ts.Signature) => {
      const predicate = context.checker.getTypePredicateOfSignature(signature)
      const predicateOption = Option.fromNullishOr(predicate)

      return Option.isSome(predicateOption)
    }

    return Array.some(callSignatures, isTypePredicate)
  }

  const matchCompositionCandidate = (
    arrowFunction: ts.ArrowFunction
  ): ReadonlyArray<Match<PreferFunctionCompositionFact>> => {
    const hasTwoStatements = (body: ts.Block) => strictEqual(2)(body.statements.length)

    const returnExpression = Function.flow(
      Struct.get<ts.ReturnStatement, "expression">("expression"),
      Option.fromNullishOr
    )

    const compositionFromBody = (body: ts.Block) =>
      Option.gen(function* () {
        const firstStatement = yield* Option.fromNullishOr(body.statements[0])
        const secondStatement = yield* Option.fromNullishOr(body.statements[1])

        const declarationList = yield* pipe(
          Option.liftPredicate(ts.isVariableStatement)(firstStatement),
          Option.map(Struct.get("declarationList"))
        )

        const isConstList = (declarationList.flags & ts.NodeFlags.Const) !== 0
        const hasOneDeclaration = strictEqual(1)(declarationList.declarations.length)

        yield* Option.liftPredicate((value: boolean) => value)(isConstList)
        yield* Option.liftPredicate((value: boolean) => value)(hasOneDeclaration)

        const binding = yield* Option.fromNullishOr(declarationList.declarations[0])

        yield* Option.liftPredicate(ts.isIdentifier)(binding.name)

        const initializer = yield* Option.fromNullishOr(binding.initializer)
        yield* Option.liftPredicate(Predicate.not(isFunctionInitializer))(initializer)

        const returned = yield* pipe(
          Option.liftPredicate(ts.isReturnStatement)(secondStatement),
          Option.flatMap(returnExpression)
        )

        const name = identifierText(binding.name as ts.Identifier)
        const isBindingName = strictEqual(name)

        const referenceCountStep = (count: number) => (node: ts.Node) =>
          pipe(
            Option.liftPredicate(ts.isIdentifier)(node),
            Option.map(identifierText),
            Option.exists(isBindingName)
          )
            ? count + 1
            : count

        const uncurriedReferenceCountReducer = Function.untupled(
          ([count, node]: readonly [number, ts.Node]) => referenceCountStep(count)(node)
        )

        const referenceCount = foldAst(uncurriedReferenceCountReducer)(returned)(0)
        const seedOnly = isSeedIdentifier(name)(returned)
        const singleReference = strictEqual(1)(referenceCount)
        const tower = isUnaryCallTowerOver(name)(returned)
        const threaded = singleReference && tower
        const keepThreaded = !seedOnly

        yield* Option.liftPredicate((value: boolean) => value)(keepThreaded)
        yield* Option.liftPredicate((value: boolean) => value)(threaded)

        const fact = PreferFunctionCompositionFact.make({ kind: "block" })
        return makeNodeMatch(body, fact)
      })

    const blockMatches = pipe(
      Option.liftPredicate(ts.isBlock)(arrowFunction.body),
      Option.filter(hasTwoStatements),
      Option.flatMap(compositionFromBody),
      Option.toArray
    )

    const adapterMatches = hasTypePredicate(arrowFunction)
      ? Array.empty<Match<PreferFunctionCompositionFact>>()
      : pipe(
          propertyComposedAdapter(arrowFunction),
          Option.flatMap((adapter) => {
            const unary = Tuple.get(adapter, 0)
            const parameter = Tuple.get(unary, 1)
            const access = Tuple.get(adapter, 1)
            const partial = Tuple.get(adapter, 2)

            return pipe(
              Option.fromNullishOr(parameter.type),
              Option.map((type) => {
                const typeText = type.getText(context.sourceFile)
                const partialText = partial.getText(context.sourceFile)

                const fact = PreferFunctionCompositionFact.make({
                  kind: "adapter",
                  typeText,
                  propertyName: access.name.text,
                  partialText
                })

                return makeNodeMatch(arrowFunction, fact)
              })
            )
          }),
          Option.toArray
        )

    const isNamedDeclaration = (
      declaration: ts.VariableDeclaration
    ): declaration is NamedVariableDeclaration => ts.isIdentifier(declaration.name)

    const isSingleConstDeclaration = (variable: ts.VariableStatement) =>
      strictEqual(1)(variable.declarationList.declarations.length)

    const firstDeclaration = (variable: ts.VariableStatement) =>
      Array.head(variable.declarationList.declarations)

    const constDeclaration = (statement: ts.Statement) =>
      pipe(
        Option.liftPredicate(ts.isVariableStatement)(statement),
        Option.filter((variable) => (variable.declarationList.flags & ts.NodeFlags.Const) !== 0),
        Option.filter(isSingleConstDeclaration),
        Option.flatMap(firstDeclaration),
        Option.filter(isNamedDeclaration)
      )

    const symbolAt = symbolOptionAt(context.checker)
    const declarationSymbol = (declaration: NamedVariableDeclaration) => symbolAt(declaration.name)

    const identifierHasSymbol = (symbol: ts.Symbol) => (expression: ts.Expression) =>
      pipe(
        unwrapTransparentExpression(expression),
        Option.liftPredicate(ts.isIdentifier),
        Option.flatMap(symbolAt),
        Option.exists(strictEqual(symbol))
      )

    const isEffectApiExpression = (expression: ts.Expression) => {
      const memberIsEffectApi = (member: ImportedMember) =>
        effectApiMember("Effect")(member.path)(member)

      return pipe(importedMemberAt(context.checker)(expression), Option.exists(memberIsEffectApi))
    }

    const isEffectApiCall = (call: ts.CallExpression) => isEffectApiExpression(call.expression)

    const isPromiseEffectCall = (call: ts.CallExpression) =>
      importedEffectApiAt(context.checker)("Effect")(runPromiseNames)(call.expression)

    const isEffectPipeStage = (expression: ts.Expression) => {
      const stage = unwrapTransparentExpression(expression)
      const apiExpression = ts.isCallExpression(stage) ? stage.expression : stage

      return isEffectApiExpression(apiExpression)
    }

    const directTransformationContinues = (symbol: ts.Symbol) => (call: ts.CallExpression) => {
      const input = pipe(Array.head(call.arguments), Option.filter(identifierHasSymbol(symbol)))
      const fromEffectApi = isEffectApiCall(call)
      const hasInput = Option.isSome(input)
      const checks = Array.make(fromEffectApi, hasInput)

      return Array.every(checks, Boolean)
    }

    const freePipeContinues = (symbol: ts.Symbol) => (call: ts.CallExpression) => {
      const input = pipe(Array.head(call.arguments), Option.filter(identifierHasSymbol(symbol)))
      const stages = pipe(Array.fromIterable(call.arguments), Array.drop(1))
      const usesPipe = isPipeCallee(call.expression)
      const hasInput = Option.isSome(input)
      const hasStages = stages.length > 0
      const hasOnlyEffectStages = Array.every(stages, isEffectPipeStage)
      const checks = Array.make(usesPipe, hasInput, hasStages, hasOnlyEffectStages)

      return Array.every(checks, Boolean)
    }

    const methodPipeContinues = (symbol: ts.Symbol) => (call: ts.CallExpression) => {
      const callee = unwrapTransparentExpression(call.expression)

      const propertyIsPipe = Function.flow(
        Struct.get<ts.PropertyAccessExpression, "name">("name"),
        Struct.get<ts.MemberName, "text">("text"),
        strictEqual("pipe")
      )

      const access = pipe(
        Option.liftPredicate(ts.isPropertyAccessExpression)(callee),
        Option.filter(propertyIsPipe)
      )

      const receiver = pipe(
        access,
        Option.map(Struct.get<ts.PropertyAccessExpression, "expression">("expression")),
        Option.filter(identifierHasSymbol(symbol))
      )

      const stages = Array.fromIterable(call.arguments)
      const hasReceiver = Option.isSome(receiver)
      const hasStages = stages.length > 0
      const hasOnlyEffectStages = Array.every(stages, isEffectPipeStage)
      const checks = Array.make(hasReceiver, hasStages, hasOnlyEffectStages)

      return Array.every(checks, Boolean)
    }

    const transformationContinues = (symbol: ts.Symbol) => (expression: ts.Expression) => {
      const continues = (call: ts.CallExpression) => {
        const direct = directTransformationContinues(symbol)(call)
        const freePipe = freePipeContinues(symbol)(call)
        const methodPipe = methodPipeContinues(symbol)(call)
        const candidates = Array.make(direct, freePipe, methodPipe)

        return Array.some(candidates, Boolean)
      }

      return pipe(
        unwrapTransparentExpression(expression),
        Option.liftPredicate(ts.isCallExpression),
        Option.exists(continues)
      )
    }

    const hasEffectType = (expression: ts.Expression) => {
      const type = context.checker.getTypeAtLocation(expression)
      const symbol = type.getSymbol()

      return pipe(
        Option.fromNullishOr(symbol),
        Option.exists(Function.flow(Struct.get<ts.Symbol, "name">("name"), strictEqual("Effect")))
      )
    }

    const terminalReturns = (symbol: ts.Symbol) => (statement: ts.Statement) => {
      const hasOneArgument = (call: ts.CallExpression) => strictEqual(1)(call.arguments.length)
      const firstArgument = (call: ts.CallExpression) => Array.head(call.arguments)

      return pipe(
        Option.liftPredicate(ts.isReturnStatement)(statement),
        Option.flatMap(returnExpression),
        Option.filter(ts.isCallExpression),
        Option.filter(isPromiseEffectCall),
        Option.filter(hasOneArgument),
        Option.flatMap(firstArgument),
        Option.exists(identifierHasSymbol(symbol))
      )
    }

    const chainContinues =
      (current: NamedVariableDeclaration) => (previous: NamedVariableDeclaration) =>
        Option.gen(function* () {
          const previousSymbol = yield* declarationSymbol(previous)
          const initializer = yield* Option.fromNullishOr(current.initializer)

          return transformationContinues(previousSymbol)(initializer)
        })

    const effectPipelineMatch = (body: ts.Block) =>
      Option.gen(function* () {
        const statements = Array.fromIterable(body.statements)
        const terminal = yield* Array.last(statements)
        const declarationStatements = pipe(statements, Array.dropRight(1))
        const declarationOptions = Array.map(declarationStatements, constDeclaration)
        const declarations = yield* Option.all(declarationOptions)
        const hasMultipleDeclarations = declarations.length >= 2
        yield* Option.liftPredicate(Function.constant(hasMultipleDeclarations))(declarations)

        const first = yield* Array.head(declarations)
        const firstInitializer = yield* Option.fromNullishOr(first.initializer)
        const firstHasEffectType = hasEffectType(firstInitializer)
        yield* Option.liftPredicate(Function.constant(firstHasEffectType))(first)

        const linkContinuesAt = (current: NamedVariableDeclaration, index: number) => {
          const continueFromPrevious = chainContinues(current)

          return pipe(
            Array.get(declarations, index),
            Option.flatMap(continueFromPrevious),
            Option.getOrElse(Function.constFalse)
          )
        }

        const links = pipe(declarations, Array.drop(1))
        const allLinksContinue = Array.every(links, linkContinuesAt)
        yield* Option.liftPredicate(Function.constant(allLinksContinue))(body)

        const symbolOptions = Array.map(declarations, declarationSymbol)
        const symbols = yield* Option.all(symbolOptions)
        const referenceCount = Function.flip(referencesToSymbol(context.checker))(body)
        const isSingleUse = Function.flow(referenceCount, strictEqual(2))
        const everyBindingIsSingleUse = Array.every(symbols, isSingleUse)
        yield* Option.liftPredicate(Function.constant(everyBindingIsSingleUse))(body)

        const finalSymbol = yield* Array.last(symbols)
        const terminalMatches = terminalReturns(finalSymbol)(terminal)
        yield* Option.liftPredicate(Function.constant(terminalMatches))(body)

        const fact = PreferFunctionCompositionFact.make({ kind: "effect-pipeline" })

        return makeNodeMatch(body, fact)
      })

    const effectPipelineMatches = pipe(
      Option.liftPredicate(ts.isBlock)(arrowFunction.body),
      Option.flatMap(effectPipelineMatch),
      Option.toArray
    )

    const candidateMatches = Array.appendAll(blockMatches, adapterMatches)

    return Array.appendAll(candidateMatches, effectPipelineMatches)
  }

  return matchCompositionCandidate
}

export const preferFunctionCompositionScanner = makeNodeScanner(arrowFunctionKinds)(
  ts.isArrowFunction
)(matches)
