import { Array, Function, Option, pipe, Predicate, Struct, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { nodeMatch, type MatchContext } from "../matcher/data.js"
import { conciseArrowBody, unwrapCarrier } from "../support/tsNode.js"
import { foldAst } from "../sources/sources.js"
import { strictEqual } from "../equivalence.js"

// PreferFunctionFlipFact is empty payload because guidance and matchers share identity.
export const PreferFunctionFlipFact = Schema.Struct({})

export interface PreferFunctionFlipFact extends Schema.Schema.Type<typeof PreferFunctionFlipFact> {}

// emptyPreferFunctionFlipFact is empty payload because guidance and matchers share identity.
export const emptyPreferFunctionFlipFact = PreferFunctionFlipFact.make({})

const emptyDeclarations: ReadonlyArray<ts.Declaration> = Array.empty()
const identifierText = Struct.get<ts.Identifier, "text">("text")
const arrowFunctionKinds = Array.of(ts.SyntaxKind.ArrowFunction)

const preferFunctionFlipMatches = (context: MatchContext) => {
  const checker = context.checker

  const symbolOption = (node: ts.Node) =>
    pipe(checker.getSymbolAtLocation(node), Option.fromNullishOr)

  const resolveAliasedSymbol = (symbol: ts.Symbol) => {
    const isAlias = (symbol.flags & ts.SymbolFlags.Alias) !== 0

    return isAlias ? checker.getAliasedSymbol(symbol) : symbol
  }

  const resolvedSymbol = (node: ts.Node) =>
    pipe(symbolOption(node), Option.map(resolveAliasedSymbol))

  const isNamespaceSymbol = (symbol: ts.Symbol) => {
    const declarationList = symbol.getDeclarations()

    const declarations = pipe(
      Option.fromNullishOr(declarationList),
      Option.getOrElse(Function.constant(emptyDeclarations))
    )

    const hasVariable = Array.some(declarations, ts.isVariableDeclaration)
    const hasInterface = Array.some(declarations, ts.isInterfaceDeclaration)
    const hasModule = Array.some(declarations, ts.isModuleDeclaration)
    const ambientValue = hasVariable && hasInterface
    const isModule = (symbol.flags & ts.SymbolFlags.Module) !== 0
    const ambientOrModule = ambientValue || hasModule

    return isModule || ambientOrModule
  }

  const propertyAccessRequiresThis = (propertyAccess: ts.PropertyAccessExpression) => {
    const namedSymbol = symbolOption(propertyAccess.name)
    const accessSymbol = symbolOption(propertyAccess)
    const propertySymbol = pipe(namedSymbol, Option.orElse(Function.constant(accessSymbol)))
    const symbolHasMethodFlag = (symbol: ts.Symbol) => (symbol.flags & ts.SymbolFlags.Method) !== 0

    const isMethod = pipe(
      propertySymbol,
      Option.map(symbolHasMethodFlag),
      Option.getOrElse(Function.constant(false))
    )

    const receiverType = checker.getTypeAtLocation(propertyAccess.expression)
    const constructCount = receiverType.getConstructSignatures().length
    const receiverIsConstructor = constructCount > 0

    const receiverIsNamespace = pipe(
      resolvedSymbol(propertyAccess.expression),
      Option.exists(isNamespaceSymbol)
    )

    const receiverLacksConstructor = strictEqual(false)(receiverIsConstructor)
    const methodNeedsReceiver = isMethod && receiverLacksConstructor
    const receiverIsInstance = strictEqual(false)(receiverIsNamespace)
    const instanceMethod = methodNeedsReceiver && receiverIsInstance

    return instanceMethod
  }

  const calleeRequiresThis = (callee: ts.Expression) => {
    const unwrapped = unwrapCarrier(callee)
    const isCall = ts.isCallExpression(unwrapped)
    const isIdentifier = ts.isIdentifier(unwrapped)
    const isFree = isCall || isIdentifier
    const isPropertyAccess = ts.isPropertyAccessExpression(unwrapped)
    const propertyNeedsThis = isPropertyAccess ? propertyAccessRequiresThis(unwrapped) : true
    const isBound = strictEqual(false)(isFree)
    const boundCalleeNeedsThis = isBound && propertyNeedsThis

    return boundCalleeNeedsThis
  }

  const referenceCount = (name: string) => {
    const isNameText = strictEqual(name)

    const referenceCountReducer = (count: number, current: ts.Node) => {
      const matchesName = pipe(
        Option.liftPredicate(ts.isIdentifier)(current),
        Option.map(identifierText),
        Option.exists(isNameText)
      )

      return matchesName ? count + 1 : count
    }

    return Function.flip(foldAst(referenceCountReducer))(0)
  }

  const hasOneArgument = (call: ts.CallExpression) => strictEqual(1)(call.arguments.length)
  const isNonSpreadArgument = Predicate.not(ts.isSpreadElement)

  const firstArgumentIsNonSpread = (call: ts.CallExpression) =>
    pipe(Option.fromNullishOr(call.arguments[0]), Option.exists(isNonSpreadArgument))

  const unaryCall = (expression: ts.Expression) =>
    pipe(
      expression,
      unwrapCarrier,
      Option.liftPredicate(ts.isCallExpression),
      Option.filter(hasOneArgument),
      Option.filter(firstArgumentIsNonSpread)
    )

  const matchFlipCandidate = (arrowFunction: ts.ArrowFunction) =>
    pipe(
      Option.gen(function* () {
        const hasOneParameter = strictEqual(1)(arrowFunction.parameters.length)
        yield* Option.liftPredicate((value: boolean) => value)(hasOneParameter)

        const parameter = yield* Option.fromNullishOr(arrowFunction.parameters[0])
        const hasRest = pipe(Option.fromNullishOr(parameter.dotDotDotToken), Option.isSome)
        const hasDefault = pipe(Option.fromNullishOr(parameter.initializer), Option.isSome)
        const isOptional = pipe(Option.fromNullishOr(parameter.questionToken), Option.isSome)
        const isIdentifierName = ts.isIdentifier(parameter.name)
        const hasRestOrDefault = hasRest || hasDefault
        const isComplex = hasRestOrDefault || isOptional
        const isNotComplex = strictEqual(false)(isComplex)
        const isSimple = isIdentifierName && isNotComplex

        yield* Option.liftPredicate((value: boolean) => value)(isSimple)

        const parameterName = identifierText(parameter.name as ts.Identifier)
        const body = yield* conciseArrowBody(arrowFunction)
        const outerCall = yield* unaryCall(body)
        const outerArgument = yield* Option.fromNullishOr(outerCall.arguments[0])
        const outerParameterRefs = referenceCount(parameterName)(outerArgument)
        const outerMentionsParameter = outerParameterRefs > 0

        yield* Option.liftPredicate((value: boolean) => !value)(outerMentionsParameter)

        const innerCall = yield* unaryCall(outerCall.expression)
        const innerArgument = yield* Option.fromNullishOr(innerCall.arguments[0])
        const innerArgumentCarrier = unwrapCarrier(innerArgument)
        const argumentIdentifier = Option.liftPredicate(ts.isIdentifier)(innerArgumentCarrier)
        const isParameterName = strictEqual(parameterName)

        const argumentIsParameter = pipe(
          argumentIdentifier,
          Option.map(identifierText),
          Option.exists(isParameterName)
        )

        yield* Option.liftPredicate((value: boolean) => value)(argumentIsParameter)

        const innerCallee = innerCall.expression
        const calleeParameterRefs = referenceCount(parameterName)(innerCallee)
        const calleeMentionsParameter = calleeParameterRefs > 0

        yield* Option.liftPredicate((value: boolean) => !value)(calleeMentionsParameter)

        const needsThis = calleeRequiresThis(innerCallee)
        yield* Option.liftPredicate((value: boolean) => !value)(needsThis)

        const bodyMentions = referenceCount(parameterName)(body)
        const singleForward = strictEqual(1)(bodyMentions)

        yield* Option.liftPredicate((value: boolean) => value)(singleForward)

        return nodeMatch(arrowFunction, emptyPreferFunctionFlipFact)
      }),
      Option.toArray
    )

  return matchFlipCandidate
}

export const preferFunctionFlipMatcher = nodeMatcher(arrowFunctionKinds)(ts.isArrowFunction)(
  preferFunctionFlipMatches
)
