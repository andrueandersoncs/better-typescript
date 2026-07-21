import { Array, Function, Option, pipe, Predicate, Struct, Tuple, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { nodeMatch, type MatchContext } from "../matcher/data.js"
import { conciseArrowBody, unwrapCarrier } from "../support/tsNode.js"
import { foldAst } from "../sources/sources.js"
import { strictEqual } from "../equivalence.js"

const preferEtaReductionStyles = Array.make<["eta", "flow"]>("eta", "flow")
const preferEtaReductionStyleSchema = Schema.Literals(preferEtaReductionStyles)

// PreferEtaReductionFact records rewrite style because eta and flow advice differ.
export const PreferEtaReductionFact = Schema.Struct({
  style: preferEtaReductionStyleSchema
})

export interface PreferEtaReductionFact extends Schema.Schema.Type<typeof PreferEtaReductionFact> {}

const emptyDeclarations: ReadonlyArray<ts.Declaration> = Array.empty()
const identifierText = Struct.get<ts.Identifier, "text">("text")

const arrowFunctionKinds = Array.of(ts.SyntaxKind.ArrowFunction)

const matches = (context: MatchContext) => {
  const checker = context.checker

  const symbolOption = (node: ts.Node) =>
    pipe(checker.getSymbolAtLocation(node), Option.fromNullishOr)

  const resolvedSymbol = (node: ts.Node) =>
    pipe(
      symbolOption(node),
      Option.map((symbol) => {
        const isAlias = (symbol.flags & ts.SymbolFlags.Alias) !== 0

        return isAlias ? checker.getAliasedSymbol(symbol) : symbol
      })
    )

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

    const isMethod = pipe(
      propertySymbol,
      Option.map((symbol) => (symbol.flags & ts.SymbolFlags.Method) !== 0),
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

  const unaryCalleeTower =
    (parameterName: string) =>
    (expression: ts.Expression): Option.Option<ReadonlyArray<ts.Expression>> => {
      const unwrapped = unwrapCarrier(expression)
      const hasOneArgument = (call: ts.CallExpression) => strictEqual(1)(call.arguments.length)

      const callOption = pipe(
        Option.liftPredicate(ts.isCallExpression)(unwrapped),
        Option.filter(hasOneArgument)
      )

      const isParameterName = strictEqual(parameterName)

      const calleesFromCall = (call: ts.CallExpression) =>
        Option.gen(function* () {
          const onlyArgument = yield* Option.fromNullishOr(call.arguments[0])
          const argument = unwrapCarrier(onlyArgument)
          const callee = call.expression
          const mentionCount = referenceCount(parameterName)(callee)
          const calleeMentionsParameter = mentionCount > 0

          yield* Option.liftPredicate((value: boolean) => !value)(calleeMentionsParameter)

          const argumentIdentifier = Option.liftPredicate(ts.isIdentifier)(argument)

          const argumentIsParameter = pipe(
            argumentIdentifier,
            Option.map(identifierText),
            Option.exists(isParameterName)
          )

          if (argumentIsParameter) {
            return Tuple.make(callee)
          }

          const inner = yield* unaryCalleeTower(parameterName)(argument)

          return Array.append(inner, callee)
        })

      return pipe(callOption, Option.flatMap(calleesFromCall))
    }

  const matchEtaReductionCandidate = (arrowFunction: ts.ArrowFunction) =>
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
        const callees = yield* unaryCalleeTower(parameterName)(body)
        const hasSteps = Array.length(callees) > 0
        const freeCallees = Array.every(callees, Predicate.not(calleeRequiresThis))

        yield* Option.liftPredicate((value: boolean) => value)(hasSteps)
        yield* Option.liftPredicate((value: boolean) => value)(freeCallees)

        const calleeCount = Array.length(callees)
        const isSingleStep = strictEqual(1)(calleeCount)
        const style = isSingleStep ? "eta" : "flow"
        const fact = PreferEtaReductionFact.make({ style })

        return nodeMatch(arrowFunction, fact)
      }),
      Option.toArray
    )

  return matchEtaReductionCandidate
}

export const preferEtaReductionMatcher = nodeMatcher(arrowFunctionKinds)(ts.isArrowFunction)(
  matches
)
