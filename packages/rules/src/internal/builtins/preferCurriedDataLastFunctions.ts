import { Array, Function, HashMap, HashSet, Option, Struct, flow, pipe } from "effect"
import * as ts from "typescript"
import { withProgramScannerIndex } from "../scanner/withProgramScannerIndex.js"
import { nodeSubscriptions } from "../scanner/nodeSubscriptions.js"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"
import type { Match } from "../scanner/match.js"
import type { MatchContext } from "../scanner/matchContext.js"
import type { Subscription } from "../scanner/subscription.js"
import { foldAst } from "../sources/foldAst.js"
import { isProjectSourceFile } from "../sources/isProjectSourceFile.js"
import { namedCandidateTarget } from "../support/namedCandidateTarget.js"
import { outermostTransparentWrapper } from "../support/outermostTransparentWrapper.js"
import { isFunctionDefinition } from "../support/isFunctionDefinition.js"
import { callArguments } from "../support/callArguments.js"
import { resolvedCallSignature } from "../support/resolvedCallSignature.js"
import { signatureDeclarationIsExternal } from "../support/signatureDeclarationIsExternal.js"
import { functionDefinitionKinds } from "./functionDefinitionKinds.js"
import { hasCallSignature } from "../support/hasCallSignature.js"
import { referenceKey } from "../support/referenceKey.js"
import type { ReferenceKey } from "../support/referenceKeyType.js"
import type { ProgramContext } from "../sources/data.js"
import { SymbolUse } from "./symbolUse.js"
import type { SymbolUses } from "./symbolUses.js"
import { strictEqual } from "../equivalence.js"
import { hasDisallowedParameterList } from "./hasDisallowedParameterList.js"
import { hasCurriedArrowBody } from "./hasCurriedArrowBody.js"
import { contextualType } from "./contextualType.js"
import { isContextuallyTypedFunction } from "./isContextuallyTypedFunction.js"
import { resolvedSymbolAt } from "../support/resolvedSymbolAt.js"
import { symbolForDeclaration } from "./namedFunctionDeclaration.js"
import { PreferCurriedDataLastFunctionsFact } from "./preferCurriedDataLastFunctionsFact.js"

// Missing declarations count as external because their shape is not author-controlled.
const signatureIsExternal = (signature: ts.Signature) =>
  pipe(
    signature.getDeclaration(),
    Option.fromNullishOr,
    Option.map(signatureDeclarationIsExternal),
    Option.getOrElse(Function.constant(true))
  )

// emptySymbolUse is the zero-use seed because callers need one shared default record.
const emptySymbolUse = SymbolUse.make({
  hasContextualReference: false,
  hasDirectCall: false,
  hasOtherReference: false
})

const emptySymbolUses: SymbolUses = HashMap.empty()

const fallbackEmptySymbolUse: () => SymbolUse = Function.constant(emptySymbolUse)

const updateSymbolUse =
  (symbol: ts.Symbol) =>
  (update: (use: SymbolUse) => SymbolUse) =>
  (uses: SymbolUses): SymbolUses => {
    const symbolKey = referenceKey(symbol)
    const currentUse = pipe(HashMap.get(uses, symbolKey), Option.getOrElse(fallbackEmptySymbolUse))
    const updatedUse = update(currentUse)

    return HashMap.set(uses, symbolKey, updatedUse)
  }

const markContextualReference = (use: SymbolUse) =>
  SymbolUse.make({
    ...use,
    hasContextualReference: true
  })

const markDirectCall = (use: SymbolUse) =>
  SymbolUse.make({
    ...use,
    hasDirectCall: true
  })

const markOtherReference = (use: SymbolUse) =>
  SymbolUse.make({
    ...use,
    hasOtherReference: true
  })

const isContextualOnlyUse = (use: SymbolUse) => {
  const hasNoDirectCall = !use.hasDirectCall
  const hasNoOtherReference = !use.hasOtherReference

  const referenceConditions = Array.make(
    use.hasContextualReference,
    hasNoDirectCall,
    hasNoOtherReference
  )

  return Array.every(referenceConditions, Boolean)
}

const foldCurriedDataLastDescendants = <A>(visit: (node: ts.Node) => (accumulator: A) => A) =>
  pipe(
    Function.untupled(([current, currentNode]: readonly [A, ts.Node]) =>
      Function.flip(visit)(current)(currentNode)
    ),
    foldAst
  )

// NameDeclaration is naming syntax protocol because variable, function, and method share lookup.
export type NameDeclaration = ts.VariableDeclaration | ts.FunctionDeclaration | ts.MethodDeclaration

const declarationHasName = (identifier: ts.Identifier) =>
  flow(Struct.get<NameDeclaration, "name">("name"), strictEqual(identifier))

const buildSymbolUses = (context: ProgramContext) => {
  const programSourceFiles = context.program.getSourceFiles()
  const sourceFiles = Array.filter(programSourceFiles, isProjectSourceFile)

  const collectTrackedSymbol =
    (node: ts.Node) =>
    (
      currentSymbols: HashSet.HashSet<ReferenceKey<ts.Symbol>>
    ): HashSet.HashSet<ReferenceKey<ts.Symbol>> =>
      pipe(
        Option.liftPredicate(isFunctionDefinition)(node),
        Option.filter((declaration) => {
          const hasDisallowedParameters = hasDisallowedParameterList(declaration)
          const hasCurriedBody = hasCurriedArrowBody(declaration)
          const isContextual = isContextuallyTypedFunction(context.checker)(declaration)

          const reportableCurryChecks = Array.make(
            hasDisallowedParameters,
            !hasCurriedBody,
            !isContextual
          )

          return Array.every(reportableCurryChecks, Boolean)
        }),
        Option.flatMap(symbolForDeclaration(context.checker)),
        Option.map((symbol) => {
          const symbolKey = referenceKey(symbol)

          return HashSet.add(currentSymbols, symbolKey)
        }),
        Option.getOrElse(() => currentSymbols)
      )

  const emptyTrackedSymbols = HashSet.empty<ReferenceKey<ts.Symbol>>()

  const trackedSymbols = Array.reduce(sourceFiles, emptyTrackedSymbols, (symbols, sourceFile) =>
    foldCurriedDataLastDescendants(collectTrackedSymbol)(sourceFile)(symbols)
  )

  const classifyNode = (node: ts.Node) => (currentUses: SymbolUses) => {
    if (!ts.isIdentifier(node)) {
      return currentUses
    }

    return pipe(
      resolvedSymbolAt(context.checker)(node),
      Option.filter((symbol) => {
        const symbolKey = referenceKey(symbol)

        return HashSet.has(trackedSymbols, symbolKey)
      }),
      Option.map((symbol) => {
        const isVariableName = pipe(
          Option.liftPredicate(ts.isVariableDeclaration)(node.parent),
          Option.exists(declarationHasName(node))
        )

        const isFunctionName = pipe(
          Option.liftPredicate(ts.isFunctionDeclaration)(node.parent),
          Option.exists(declarationHasName(node))
        )

        const isMethodName = pipe(
          Option.liftPredicate(ts.isMethodDeclaration)(node.parent),
          Option.exists(declarationHasName(node))
        )

        const declarationNameChecks = Array.make(isVariableName, isFunctionName, isMethodName)
        const isDeclaration = Array.some(declarationNameChecks, Boolean)

        if (isDeclaration) {
          return currentUses
        }

        const expression = outermostTransparentWrapper(node)

        const callUsesExpression = flow(
          Struct.get<ts.CallExpression, "expression">("expression"),
          strictEqual(expression)
        )

        const isDirectCall = pipe(
          Option.liftPredicate(ts.isCallExpression)(expression.parent),
          Option.exists(callUsesExpression)
        )

        if (isDirectCall) {
          return updateSymbolUse(symbol)(markDirectCall)(currentUses)
        }

        const parentCall = Option.liftPredicate(ts.isCallExpression)(expression.parent)
        const args = pipe(parentCall, Option.map(callArguments), Option.getOrElse(Array.empty))
        const index = Array.findFirstIndex(args, strictEqual(expression))
        const expressionContextualType = contextualType(context.checker)(expression)

        const signatureType = pipe(
          parentCall,
          Option.flatMap((call) => {
            const typeOfCallParameter = (parameter: ts.Symbol) =>
              context.checker.getTypeOfSymbolAtLocation(parameter, call)

            const parameterTypeAt = (position: number) => {
              const signature = resolvedCallSignature(context.checker)(call)

              const parameters = pipe(
                signature,
                Option.map(Struct.get("parameters")),
                Option.getOrElse(Array.empty)
              )

              const parameter = Array.get(parameters, position)

              return Option.map(parameter, typeOfCallParameter)
            }

            return pipe(index, Option.flatMap(parameterTypeAt))
          })
        )

        const optionHasCallableType = (type: Option.Option<ts.Type>) =>
          Option.exists(type, hasCallSignature(context.checker))

        const contextualTypes = Array.make(expressionContextualType, signatureType)
        const hasCallableContext = Array.some(contextualTypes, optionHasCallableType)

        const callHasExternalCallbackBoundary = (call: ts.CallExpression) =>
          pipe(resolvedCallSignature(context.checker)(call), Option.exists(signatureIsExternal))

        const hasExternalCallbackBoundary = pipe(
          parentCall,
          Option.exists(callHasExternalCallbackBoundary)
        )

        const contextualArgumentChecks = Array.make(hasCallableContext, hasExternalCallbackBoundary)
        const isContextualArgument = Array.every(contextualArgumentChecks, Boolean)
        const referenceUpdate = isContextualArgument ? markContextualReference : markOtherReference

        return updateSymbolUse(symbol)(referenceUpdate)(currentUses)
      }),
      Option.getOrElse(() => currentUses)
    )
  }

  return Array.reduce(sourceFiles, emptySymbolUses, (uses, sourceFile) =>
    foldCurriedDataLastDescendants(classifyNode)(sourceFile)(uses)
  )
}

const emptyFact = PreferCurriedDataLastFunctionsFact.make({})

const curriedDataLastListeners = (symbolUses: SymbolUses): ReadonlyArray<Subscription> => {
  const elements = (context: MatchContext) => {
    const matches = (
      declaration: ts.Node
    ): ReadonlyArray<Match<PreferCurriedDataLastFunctionsFact>> => {
      if (!isFunctionDefinition(declaration)) {
        return Array.empty()
      }

      const hasDisallowedParameters = hasDisallowedParameterList(declaration)
      const hasCurriedBody = hasCurriedArrowBody(declaration)
      const isContextual = isContextuallyTypedFunction(context.checker)(declaration)

      const hasOnlyContextualUse = pipe(
        symbolForDeclaration(context.checker)(declaration),
        Option.flatMap((symbol) => {
          const symbolKey = referenceKey(symbol)

          return HashMap.get(symbolUses, symbolKey)
        }),
        Option.exists(isContextualOnlyUse)
      )

      const finalReportChecks = Array.make(
        hasDisallowedParameters,
        !hasCurriedBody,
        !isContextual,
        !hasOnlyContextualUse
      )

      const shouldReport = Array.every(finalReportChecks, Boolean)

      if (!shouldReport) {
        return Array.empty()
      }

      const functionTarget = pipe(
        Option.liftPredicate(ts.isFunctionDeclaration)(declaration),
        Option.map(namedCandidateTarget)
      )

      const methodTarget = pipe(
        Option.liftPredicate(ts.isMethodDeclaration)(declaration),
        Option.map(namedCandidateTarget)
      )

      const fallbackNode = Function.constant(declaration as ts.Node)
      const methodFallback = Function.constant(methodTarget)

      const node = pipe(
        functionTarget,
        Option.orElse(methodFallback),
        Option.getOrElse(fallbackNode)
      )

      const match = makeNodeMatch(node, emptyFact)

      return Array.of(match)
    }

    return matches
  }

  return nodeSubscriptions(functionDefinitionKinds)(isFunctionDefinition)(elements)
}

export const preferCurriedDataLastFunctionsScanner =
  withProgramScannerIndex(buildSymbolUses)(curriedDataLastListeners)
