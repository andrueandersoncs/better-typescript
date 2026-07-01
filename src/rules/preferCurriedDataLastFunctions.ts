import { Array, Function, HashMap, HashSet, Option, Schema, pipe } from "effect"
import * as ts from "typescript"
import { astChildren } from "./traverse.js"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import {
  conciseArrowBody,
  isFunctionInitializer,
  isProjectSourceFile,
  namedNodeReportTarget,
  outermostTransparentWrapper,
  unwrapTransparentExpression
} from "./tsNode.js"
import { hasCallSignature } from "./tsType.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "prefer-curried-data-last-functions"

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

const symbolUseCache = new WeakMap<ts.Program, SymbolUses>()

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

  return [hasRestParameter(declaration), hasMultipleRuntimeParameters].some(Boolean)
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
    pipe(contextualType(checker)(expression), Option.exists(hasCallableType(checker)))

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

    return [
      hasDisallowedParameters,
      !hasCurriedBody,
      !isContextual
    ].every(Boolean)
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

type FoldChild<A> = (current: A, child: ts.Node) => A

type SourceFileTrackedSymbolReducer = (
  symbols: HashSet.HashSet<ts.Symbol>,
  sourceFile: ts.SourceFile
) => HashSet.HashSet<ts.Symbol>

const foldCurriedDataLastChild =
  <A>(visit: (node: ts.Node) => (accumulator: A) => A): FoldChild<A> =>
  (current, child) =>
    foldCurriedDataLastDescendants(visit)(child)(current)

const foldCurriedDataLastDescendants =
  <A>(visit: (node: ts.Node) => (accumulator: A) => A) =>
  (node: ts.Node) =>
  (accumulator: A): A => {
    const afterSelf = visit(node)(accumulator)
    const children = astChildren(node)

    return Array.reduce(children, afterSelf, foldCurriedDataLastChild(visit))
  }

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

const fallbackEmptySymbolUse = (): SymbolUse => emptySymbolUse

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

const resolvedCallSignature =
  (checker: ts.TypeChecker) =>
  (call: ts.CallExpression): Option.Option<ts.Signature> => {
    const signature = checker.getResolvedSignature(call)

    return Option.fromNullable(signature)
  }

const signatureDeclarationIsExternal = (
  declaration: ts.Declaration
): boolean => {
  const sourceFile = declaration.getSourceFile()

  return !isProjectSourceFile(sourceFile)
}

const signatureIsExternal = (signature: ts.Signature): boolean => {
  const declaration = signature.getDeclaration()

  return pipe(
    Option.fromNullable(declaration),
    Option.map(signatureDeclarationIsExternal),
    Option.getOrElse(Function.constant(true))
  )
}

const resolvedSignatureIsExternal =
  (checker: ts.TypeChecker) =>
  (call: ts.CallExpression): boolean =>
    pipe(resolvedCallSignature(checker)(call), Option.exists(signatureIsExternal))

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
  | ts.VariableDeclaration
  | ts.FunctionDeclaration
  | ts.MethodDeclaration

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

const buildSymbolUses =
  (program: ts.Program) =>
  (checker: ts.TypeChecker) =>
  (): SymbolUses => {
    const sourceFiles = program.getSourceFiles().filter(isProjectSourceFile)
    const trackedSymbols = trackedSymbolsForProgram(program)(checker)

    return Array.reduce(
      sourceFiles,
      emptySymbolUses,
      classifySourceFileUses(checker)(trackedSymbols)
    )
  }

const symbolUsesForProgram =
  (program: ts.Program) =>
  (checker: ts.TypeChecker) =>
  (): SymbolUses => {
    const cached = symbolUseCache.get(program)
    const symbolUses = pipe(
      Option.fromNullable(cached),
      Option.getOrElse(buildSymbolUses(program)(checker))
    )

    symbolUseCache.set(program, symbolUses)

    return symbolUses
  }

const isContextualOnlyUse = (use: SymbolUse): boolean => {
  const isContextualReference = use.hasContextualReference
  const hasNoDirectCall = !use.hasDirectCall
  const hasNoOtherReference = !use.hasOtherReference

  return [
    isContextualReference,
    hasNoDirectCall,
    hasNoOtherReference
  ].every(Boolean)
}

const symbolUseFrom =
  (symbolUses: SymbolUses) =>
  (symbol: ts.Symbol): Option.Option<SymbolUse> =>
    HashMap.get(symbolUses, symbol)

const hasOnlyContextualReferences =
  (context: RuleContext) =>
  (declaration: CurriedDataLastCandidate): boolean => {
    const symbolUses = symbolUsesForProgram(context.program)(context.checker)()

    return pipe(
      symbolForDeclaration(context.checker)(declaration),
      Option.flatMap(symbolUseFrom(symbolUses)),
      Option.exists(isContextualOnlyUse)
    )
  }


const curriedDataLastMatch =
  (context: RuleContext) =>
  (declaration: CurriedDataLastCandidate): RuleMatch => {
    const functionTarget = pipe(
      Option.liftPredicate(ts.isFunctionDeclaration)(declaration),
      Option.map(namedNodeReportTarget)
    )
    const methodTarget = pipe(
      Option.liftPredicate(ts.isMethodDeclaration)(declaration),
      Option.map(namedNodeReportTarget)
    )
    const node = pipe(
      functionTarget,
      Option.orElse(Function.constant(methodTarget)),
      Option.getOrElse(Function.constant(declaration))
    )

    return createRuleMatch(context)({
      ruleId,
      node,
      message: "Prefer curried, data-last functions.",
      hint:
        "Split this function into one parameter per arrow, applying configuration first and " +
        "the data argument last. If a third-party callback dictates this shape, keep it " +
        "behind the typed callback boundary."
    })
  }

const curriedDataLastMatches =
  (context: RuleContext) =>
  (declaration: CurriedDataLastCandidate): ReadonlyArray<RuleMatch> => {
    const hasDisallowedParameters = hasDisallowedParameterList(declaration)
    const hasCurriedBody = hasCurriedArrowBody(declaration)
    const isContextual = isContextuallyTypedFunction(context.checker)(declaration)
    const hasOnlyContextualUse = hasOnlyContextualReferences(context)(declaration)
    const shouldReport = [
      hasDisallowedParameters,
      !hasCurriedBody,
      !isContextual,
      !hasOnlyContextualUse
    ].every(Boolean)
  
    return shouldReport ? [curriedDataLastMatch(context)(declaration)] : []
  }

const check = onNode(candidateKinds)(isCurriedDataLastCandidate)(curriedDataLastMatches)

const badExample = new ExampleSnippet({
  filePath: "src/math.ts",
  code: `const add = (left: number, right: number): number =>
  left + right`
})

const goodExample = new ExampleSnippet({
  filePath: "src/math.ts",
  code: `const add =
  (left: number) =>
  (right: number): number =>
    left + right`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const preferCurriedDataLastFunctions = new Rule({
  id: ruleId,
  description:
    "Require author-controlled functions to be curried with the data argument last.",
  example,
  check
})
