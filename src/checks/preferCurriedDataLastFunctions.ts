import { Array, Function, HashMap, HashSet, Option, Schema, pipe } from "effect"
import * as ts from "typescript"
import { nodeSubscriptions, withProgramIndex } from "../engine/check.js"
import { detection } from "../engine/location.js"
import type { MakeDetection } from "../engine/location.js"
import {
  conciseArrowBody,
  isFunctionInitializer,
  namedDetectionTarget,
  outermostTransparentWrapper,
  unwrapTransparentExpression
} from "./support/tsNode.js"
import { foldAst, isProjectSourceFile, type AstFold } from "../engine/sources.js"
import {
  resolvedCallSignature,
  signatureIsExternal
} from "./support/tsSignature.js"
import { hasCallSignature } from "./support/tsType.js"
import type { Check, CheckContext, Subscription } from "../engine/check.js"
import type { Detection } from "../engine/location.js"
import type { ProgramContext } from "../engine/sources.js"

type CurriedDataLastCandidate =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration

type SymbolUses = HashMap.HashMap<ts.Symbol, SymbolUse>

class SymbolUse extends Schema.Class<SymbolUse>("SymbolUse")({
  hasContextualReference: Schema.Boolean,
  hasDirectCall: Schema.Boolean,
  hasOtherReference: Schema.Boolean
}) {}

const emptySymbolUse = new SymbolUse({
  hasContextualReference: false,
  hasDirectCall: false,
  hasOtherReference: false
})

const emptySymbolUses: SymbolUses = HashMap.empty()

const candidateKinds: ReadonlyArray<ts.SyntaxKind> = [
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration
]

const isCurriedDataLastCandidate = (
  node: ts.Node
): node is CurriedDataLastCandidate =>
  [
    ts.isFunctionDeclaration(node),
    ts.isFunctionExpression(node),
    ts.isArrowFunction(node),
    ts.isMethodDeclaration(node)
  ].some(Boolean)

const isRuntimeParameter = (parameter: ts.ParameterDeclaration): boolean => {
  const sourceFile = parameter.getSourceFile()
  const parameterName = parameter.name.getText(sourceFile)

  return parameterName !== "this"
}

const parameterHasRestToken = (parameter: ts.ParameterDeclaration): boolean => {
  const restToken = Option.fromNullable(parameter.dotDotDotToken)

  return Option.isSome(restToken)
}

const hasRestParameter = (declaration: CurriedDataLastCandidate): boolean =>
  declaration.parameters.some(parameterHasRestToken)

const runtimeParameters = (
  declaration: CurriedDataLastCandidate
): ReadonlyArray<ts.ParameterDeclaration> =>
  declaration.parameters.filter(isRuntimeParameter)

const hasDisallowedParameterList = (
  declaration: CurriedDataLastCandidate
): boolean => {
  const hasMultipleRuntimeParameters = runtimeParameters(declaration).length > 1

  return [hasRestParameter(declaration), hasMultipleRuntimeParameters].some(
    Boolean
  )
}

const hasCurriedArrowBody = (
  declaration: CurriedDataLastCandidate
): boolean => {
  const parameters = runtimeParameters(declaration)
  const hasSingleRuntimeParameter = parameters.length === 1
  const hasNoRestParameter = !hasRestParameter(declaration)
  const hasCurriedParameterList = [
    hasSingleRuntimeParameter,
    hasNoRestParameter
  ].every(Boolean)
  const bodyIsFunctionInitializer = pipe(
    Option.liftPredicate(ts.isArrowFunction)(declaration),
    Option.flatMap(conciseArrowBody),
    Option.map(unwrapTransparentExpression),
    Option.exists(isFunctionInitializer)
  )

  return [hasCurriedParameterList, bodyIsFunctionInitializer].every(Boolean)
}

const hasCallableType =
  (checker: ts.TypeChecker) =>
  (type: ts.Type): boolean =>
    hasCallSignature(checker)(type)

const contextualType =
  (checker: ts.TypeChecker) =>
  (expression: ts.Expression): Option.Option<ts.Type> => {
    const type = checker.getContextualType(expression)

    return Option.fromNullable(type)
  }

const hasContextualCallableType =
  (checker: ts.TypeChecker) =>
  (expression: ts.Expression): boolean =>
    pipe(
      contextualType(checker)(expression),
      Option.exists(hasCallableType(checker))
    )

const isContextuallyTypedFunction =
  (checker: ts.TypeChecker) =>
  (declaration: CurriedDataLastCandidate): boolean =>
    pipe(
      Option.liftPredicate(isFunctionInitializer)(declaration),
      Option.exists(hasContextualCallableType(checker))
    )

const symbolWithoutAlias =
  (checker: ts.TypeChecker) =>
  (symbol: ts.Symbol): ts.Symbol => {
    const isAlias = (symbol.flags & ts.SymbolFlags.Alias) !== 0

    return isAlias ? checker.getAliasedSymbol(symbol) : symbol
  }

const symbolAtLocation =
  (checker: ts.TypeChecker) =>
  (node: ts.Node): Option.Option<ts.Symbol> => {
    const symbol = checker.getSymbolAtLocation(node)

    return pipe(
      Option.fromNullable(symbol),
      Option.map(symbolWithoutAlias(checker))
    )
  }

type NamedFunctionDeclaration = ts.FunctionDeclaration | ts.MethodDeclaration

const namedFunctionDeclarationName = (
  declaration: NamedFunctionDeclaration
): Option.Option<ts.Node> => Option.fromNullable(declaration.name)

const variableDeclarationIdentifierName = (
  declaration: ts.VariableDeclaration
): Option.Option<ts.Identifier> =>
  pipe(
    Option.some(declaration.name),
    Option.flatMap(Option.liftPredicate(ts.isIdentifier))
  )

const symbolForDeclaration =
  (checker: ts.TypeChecker) =>
  (declaration: CurriedDataLastCandidate): Option.Option<ts.Symbol> => {
    const methodName = pipe(
      Option.liftPredicate(ts.isMethodDeclaration)(declaration),
      Option.flatMap(namedFunctionDeclarationName)
    )
    const variableName = pipe(
      Option.liftPredicate(ts.isVariableDeclaration)(declaration.parent),
      Option.flatMap(variableDeclarationIdentifierName)
    )
    const declarationName = pipe(
      Option.liftPredicate(ts.isFunctionDeclaration)(declaration),
      Option.flatMap(namedFunctionDeclarationName),
      Option.orElse(Function.constant(methodName)),
      Option.orElse(Function.constant(variableName))
    )

    return pipe(declarationName, Option.flatMap(symbolAtLocation(checker)))
  }

const shouldTrackDeclaration =
  (checker: ts.TypeChecker) =>
  (declaration: CurriedDataLastCandidate): boolean => {
    const hasDisallowedParameters = hasDisallowedParameterList(declaration)
    const hasCurriedBody = hasCurriedArrowBody(declaration)
    const isContextual = isContextuallyTypedFunction(checker)(declaration)

    return [hasDisallowedParameters, !hasCurriedBody, !isContextual].every(
      Boolean
    )
  }

const addTrackedSymbol =
  (symbols: HashSet.HashSet<ts.Symbol>) =>
  (symbol: ts.Symbol): HashSet.HashSet<ts.Symbol> =>
    HashSet.add(symbols, symbol)

const collectTrackedSymbol =
  (checker: ts.TypeChecker) =>
  (node: ts.Node) =>
  (symbols: HashSet.HashSet<ts.Symbol>): HashSet.HashSet<ts.Symbol> =>
    pipe(
      Option.liftPredicate(isCurriedDataLastCandidate)(node),
      Option.filter(shouldTrackDeclaration(checker)),
      Option.flatMap(symbolForDeclaration(checker)),
      Option.map(addTrackedSymbol(symbols)),
      Option.getOrElse(Function.constant(symbols))
    )

type SourceFileTrackedSymbolReducer = (
  symbols: HashSet.HashSet<ts.Symbol>,
  sourceFile: ts.SourceFile
) => HashSet.HashSet<ts.Symbol>

const uncurriedFold =
  <A>(visit: (node: ts.Node) => (accumulator: A) => A): AstFold<A> =>
  (accumulator, node) =>
    visit(node)(accumulator)

const foldCurriedDataLastDescendants =
  <A>(visit: (node: ts.Node) => (accumulator: A) => A) =>
  (node: ts.Node) =>
  (accumulator: A): A =>
    foldAst(uncurriedFold(visit))(node)(accumulator)

const collectSourceFileTrackedSymbols =
  (checker: ts.TypeChecker): SourceFileTrackedSymbolReducer =>
  (symbols, sourceFile) =>
    foldCurriedDataLastDescendants(collectTrackedSymbol(checker))(sourceFile)(
      symbols
    )

const trackedSymbolsForProgram =
  (program: ts.Program) =>
  (checker: ts.TypeChecker): HashSet.HashSet<ts.Symbol> => {
    const sourceFiles = program.getSourceFiles().filter(isProjectSourceFile)
    const emptyTrackedSymbols = HashSet.empty<ts.Symbol>()

    return Array.reduce(
      sourceFiles,
      emptyTrackedSymbols,
      collectSourceFileTrackedSymbols(checker)
    )
  }

const fallbackEmptySymbolUse: () => SymbolUse =
  Function.constant(emptySymbolUse)

const useForSymbol =
  (uses: SymbolUses) =>
  (symbol: ts.Symbol): SymbolUse =>
    pipe(HashMap.get(uses, symbol), Option.getOrElse(fallbackEmptySymbolUse))

const updateSymbolUse =
  (symbol: ts.Symbol) =>
  (update: (use: SymbolUse) => SymbolUse) =>
  (uses: SymbolUses): SymbolUses => {
    const currentUse = useForSymbol(uses)(symbol)
    const updatedUse = update(currentUse)

    return HashMap.set(uses, symbol, updatedUse)
  }

const markContextualReference = (use: SymbolUse): SymbolUse =>
  new SymbolUse({
    ...use,
    hasContextualReference: true
  })

const markDirectCall = (use: SymbolUse): SymbolUse =>
  new SymbolUse({
    ...use,
    hasDirectCall: true
  })

const markOtherReference = (use: SymbolUse): SymbolUse =>
  new SymbolUse({
    ...use,
    hasOtherReference: true
  })

const isSameCurriedDataLastExpression =
  (expression: ts.Expression) =>
  (candidate: ts.Expression): boolean =>
    candidate === expression

const argumentIndex =
  (expression: ts.Expression) =>
  (args: ts.NodeArray<ts.Expression>): Option.Option<number> => {
    const index = args.findIndex(isSameCurriedDataLastExpression(expression))

    return index < 0 ? Option.none() : Option.some(index)
  }

const signatureParameter =
  (index: number) =>
  (signature: ts.Signature): Option.Option<ts.Symbol> =>
    Option.fromNullable(signature.parameters[index])

const parameterTypeAtCall =
  (checker: ts.TypeChecker) =>
  (call: ts.CallExpression) =>
  (parameter: ts.Symbol): ts.Type =>
    checker.getTypeOfSymbolAtLocation(parameter, call)

const resolvedSignatureIsExternal =
  (checker: ts.TypeChecker) =>
  (call: ts.CallExpression): boolean =>
    pipe(
      resolvedCallSignature(checker)(call),
      Option.exists(signatureIsExternal)
    )

const resolvedSignatureParameterType =
  (checker: ts.TypeChecker) =>
  (call: ts.CallExpression) =>
  (index: number): Option.Option<ts.Type> =>
    pipe(
      resolvedCallSignature(checker)(call),
      Option.flatMap(signatureParameter(index)),
      Option.map(parameterTypeAtCall(checker)(call))
    )

const resolvedParameterTypeAtIndex =
  (checker: ts.TypeChecker) =>
  (index: Option.Option<number>) =>
  (call: ts.CallExpression): Option.Option<ts.Type> =>
    pipe(index, Option.flatMap(resolvedSignatureParameterType(checker)(call)))

const optionHasCallableType =
  (checker: ts.TypeChecker) =>
  (type: Option.Option<ts.Type>): boolean =>
    Option.exists(type, hasCallableType(checker))

const isContextualFunctionArgument =
  (checker: ts.TypeChecker) =>
  (expression: ts.Expression): boolean => {
    const parent = expression.parent
    const parentCall = Option.liftPredicate(ts.isCallExpression)(parent)
    const index = ts.isCallExpression(parent)
      ? argumentIndex(expression)(parent.arguments)
      : Option.none()
    const expressionContextualType = contextualType(checker)(expression)
    const signatureType = pipe(
      parentCall,
      Option.flatMap(resolvedParameterTypeAtIndex(checker)(index))
    )
    const hasCallableContext = [expressionContextualType, signatureType].some(
      optionHasCallableType(checker)
    )
    const hasExternalCallbackBoundary = pipe(
      parentCall,
      Option.exists(resolvedSignatureIsExternal(checker))
    )

    return [hasCallableContext, hasExternalCallbackBoundary].every(Boolean)
  }

const curriedDataLastSymbolInSet =
  (symbols: HashSet.HashSet<ts.Symbol>) =>
  (symbol: ts.Symbol): boolean =>
    HashSet.has(symbols, symbol)

type NameDeclaration =
  ts.VariableDeclaration | ts.FunctionDeclaration | ts.MethodDeclaration

const declarationHasName =
  (identifier: ts.Identifier) =>
  (declaration: NameDeclaration): boolean =>
    declaration.name === identifier

const callExpressionIsCallee =
  (expression: ts.Expression) =>
  (call: ts.CallExpression): boolean =>
    call.expression === expression

const classifySymbolReference =
  (checker: ts.TypeChecker) =>
  (identifier: ts.Identifier) =>
  (uses: SymbolUses) =>
  (symbol: ts.Symbol): SymbolUses => {
    const identifierParent = identifier.parent
    const isVariableName = pipe(
      Option.liftPredicate(ts.isVariableDeclaration)(identifierParent),
      Option.exists(declarationHasName(identifier))
    )
    const isFunctionName = pipe(
      Option.liftPredicate(ts.isFunctionDeclaration)(identifierParent),
      Option.exists(declarationHasName(identifier))
    )
    const isMethodName = pipe(
      Option.liftPredicate(ts.isMethodDeclaration)(identifierParent),
      Option.exists(declarationHasName(identifier))
    )
    const isDeclaration = [isVariableName, isFunctionName, isMethodName].some(
      Boolean
    )

    if (isDeclaration) {
      return uses
    }

    const expression = outermostTransparentWrapper(identifier)
    const expressionParent = expression.parent
    const isDirectCall = pipe(
      Option.liftPredicate(ts.isCallExpression)(expressionParent),
      Option.exists(callExpressionIsCallee(expression))
    )

    if (isDirectCall) {
      return updateSymbolUse(symbol)(markDirectCall)(uses)
    }

    const referenceUpdate = isContextualFunctionArgument(checker)(expression)
      ? markContextualReference
      : markOtherReference

    return updateSymbolUse(symbol)(referenceUpdate)(uses)
  }

const classifyIdentifier =
  (checker: ts.TypeChecker) =>
  (trackedSymbols: HashSet.HashSet<ts.Symbol>) =>
  (identifier: ts.Identifier) =>
  (uses: SymbolUses): SymbolUses =>
    pipe(
      symbolAtLocation(checker)(identifier),
      Option.filter(curriedDataLastSymbolInSet(trackedSymbols)),
      Option.map(classifySymbolReference(checker)(identifier)(uses)),
      Option.getOrElse(Function.constant(uses))
    )

const classifyNode =
  (checker: ts.TypeChecker) =>
  (trackedSymbols: HashSet.HashSet<ts.Symbol>) =>
  (node: ts.Node) =>
  (uses: SymbolUses): SymbolUses =>
    ts.isIdentifier(node)
      ? classifyIdentifier(checker)(trackedSymbols)(node)(uses)
      : uses

type SourceFileSymbolUseReducer = (
  uses: SymbolUses,
  sourceFile: ts.SourceFile
) => SymbolUses

const classifySourceFileUses =
  (checker: ts.TypeChecker) =>
  (trackedSymbols: HashSet.HashSet<ts.Symbol>): SourceFileSymbolUseReducer =>
  (uses, sourceFile) =>
    foldCurriedDataLastDescendants(classifyNode(checker)(trackedSymbols))(
      sourceFile
    )(uses)

const buildSymbolUses = (context: ProgramContext): SymbolUses => {
  const sourceFiles = context.program
    .getSourceFiles()
    .filter(isProjectSourceFile)
  const trackedSymbols = trackedSymbolsForProgram(context.program)(
    context.checker
  )

  return Array.reduce(
    sourceFiles,
    emptySymbolUses,
    classifySourceFileUses(context.checker)(trackedSymbols)
  )
}

const isContextualOnlyUse = (use: SymbolUse): boolean => {
  const isContextualReference = use.hasContextualReference
  const hasNoDirectCall = !use.hasDirectCall
  const hasNoOtherReference = !use.hasOtherReference

  return [isContextualReference, hasNoDirectCall, hasNoOtherReference].every(
    Boolean
  )
}

const symbolUseFrom =
  (symbolUses: SymbolUses) =>
  (symbol: ts.Symbol): Option.Option<SymbolUse> =>
    HashMap.get(symbolUses, symbol)

const hasOnlyContextualReferences =
  (symbolUses: SymbolUses) =>
  (checker: ts.TypeChecker) =>
  (declaration: CurriedDataLastCandidate): boolean =>
    pipe(
      symbolForDeclaration(checker)(declaration),
      Option.flatMap(symbolUseFrom(symbolUses)),
      Option.exists(isContextualOnlyUse)
    )

const curriedDataLastElement =
  (makeElement: MakeDetection) =>
  (declaration: CurriedDataLastCandidate): Detection => {
    const functionTarget = pipe(
      Option.liftPredicate(ts.isFunctionDeclaration)(declaration),
      Option.map(namedDetectionTarget)
    )
    const methodTarget = pipe(
      Option.liftPredicate(ts.isMethodDeclaration)(declaration),
      Option.map(namedDetectionTarget)
    )
    const node = pipe(
      functionTarget,
      Option.orElse(Function.constant(methodTarget)),
      Option.getOrElse(Function.constant(declaration))
    )

    return makeElement({
      node,
      message: "",
      hint: ""
    })
  }

const curriedDataLastElements =
  (symbolUses: SymbolUses) => (context: CheckContext) => {
    const isContextuallyTyped = isContextuallyTypedFunction(context.checker)
    const hasOnlyContextualUses = hasOnlyContextualReferences(symbolUses)(
      context.checker
    )
    const makeElement = detection(context)
    const buildElement = curriedDataLastElement(makeElement)

    const elements = (
      declaration: CurriedDataLastCandidate
    ): ReadonlyArray<Detection> => {
      const hasDisallowedParameters = hasDisallowedParameterList(declaration)
      const hasCurriedBody = hasCurriedArrowBody(declaration)
      const isContextual = isContextuallyTyped(declaration)
      const hasOnlyContextualUse = hasOnlyContextualUses(declaration)
      const shouldReport = [
        hasDisallowedParameters,
        !hasCurriedBody,
        !isContextual,
        !hasOnlyContextualUse
      ].every(Boolean)

      return shouldReport ? [buildElement(declaration)] : []
    }

    return elements
  }

const curriedDataLastListeners = (
  symbolUses: SymbolUses
): ReadonlyArray<Subscription> =>
  nodeSubscriptions(candidateKinds)(isCurriedDataLastCandidate)(
    curriedDataLastElements(symbolUses)
  )

const check = withProgramIndex(buildSymbolUses)(curriedDataLastListeners)

export const preferCurriedDataLastFunctions: Check = check
