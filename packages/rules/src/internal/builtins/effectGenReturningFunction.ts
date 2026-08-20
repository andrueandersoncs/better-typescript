import {
  Array,
  Equivalence,
  Function,
  HashSet,
  Match,
  Option,
  Predicate,
  Struct,
  Tuple,
  flow,
  pipe
} from "effect"
import * as ts from "typescript"
import { strictEqual } from "../equivalence.js"
import { resultExpressions } from "../support/enclosingFunctionLike.js"
import { effectApiMember } from "../support/effectApi/effectApiMember.js"
import { declarationsOfSymbol } from "../support/effectApi/declarationsOfSymbol.js"
import { ImportedMember } from "../support/effectApi/importedMember.js"
import { importedMemberAt } from "../support/effectApi/importedMemberAt.js"
import type { FunctionDefinition } from "../support/functionDefinition.js"
import { isFunctionDefinition } from "../support/isFunctionDefinition.js"
import { declarationListIsConst } from "../support/declarationListIsConst.js"
import { propertyNameText } from "../support/propertyNameText.js"
import { unwrapCarrier } from "../support/unwrapCarrier.js"
import { variableDeclarationInitializer } from "../support/variableDeclarationInitializer.js"

const noSymbols: HashSet.HashSet<ts.Symbol> = HashSet.empty()
const noStrings: ReadonlyArray<string> = Array.empty()

const modifierIsAsync = flow(
  Struct.get<ts.ModifierLike, "kind">("kind"),
  strictEqual(ts.SyntaxKind.AsyncKeyword)
)

const isAsync = (declaration: FunctionDefinition) =>
  pipe(declaration.modifiers, Option.fromNullishOr, Option.exists(Array.some(modifierIsAsync)))

const declarationAsteriskToken = (declaration: ts.FunctionDeclaration) =>
  Option.fromNullishOr(declaration.asteriskToken)

const expressionAsteriskToken = (expression: ts.FunctionExpression) =>
  Option.fromNullishOr(expression.asteriskToken)

const methodAsteriskToken = (method: ts.MethodDeclaration) =>
  Option.fromNullishOr(method.asteriskToken)

const generatorAsteriskToken = (declaration: FunctionDefinition) =>
  pipe(
    Match.value(declaration),
    Match.when(ts.isFunctionDeclaration, declarationAsteriskToken),
    Match.when(ts.isFunctionExpression, expressionAsteriskToken),
    Match.when(ts.isMethodDeclaration, methodAsteriskToken),
    Match.orElse(Option.none as () => Option.Option<ts.AsteriskToken>)
  )

const isGenerator = flow(generatorAsteriskToken, Option.isSome)

const isEffectReturningFunction = (declaration: FunctionDefinition) => {
  const notAsync = !isAsync(declaration)
  const notGenerator = !isGenerator(declaration)
  const checks = Array.make(notAsync, notGenerator)

  return Array.every(checks, Boolean)
}

const sameExpression = Equivalence.strictEqual<ts.Expression>()

const unwrapEffectCarrier = (expression: ts.Expression): ts.Expression => {
  const current = unwrapCarrier(expression)
  const isUnwrapped = sameExpression(current, expression)

  return isUnwrapped ? current : unwrapEffectCarrier(current)
}

const constVariableInitializer = (declaration: ts.Declaration) =>
  Option.gen(function* () {
    const variable = yield* Option.liftPredicate(ts.isVariableDeclaration)(declaration)
    const list = yield* Option.liftPredicate(ts.isVariableDeclarationList)(variable.parent)
    yield* Option.liftPredicate(declarationListIsConst)(list)

    return yield* variableDeclarationInitializer(variable)
  })

const makeVariableAliasOrigin = (expression: ts.Expression) => Tuple.make(expression, noStrings)

const variableAliasOrigin = flow(constVariableInitializer, Option.map(makeVariableAliasOrigin))

const bindingAliasOrigin = (declaration: ts.Declaration) =>
  Option.gen(function* () {
    const binding = yield* Option.liftPredicate(ts.isBindingElement)(declaration)
    const pattern = yield* Option.liftPredicate(ts.isObjectBindingPattern)(binding.parent)
    const variable = yield* Option.liftPredicate(ts.isVariableDeclaration)(pattern.parent)
    const list = yield* Option.liftPredicate(ts.isVariableDeclarationList)(variable.parent)
    yield* Option.liftPredicate(declarationListIsConst)(list)

    const property = binding.propertyName ?? binding.name
    const propertyNode = yield* Option.liftPredicate(ts.isPropertyName)(property)
    const memberName = yield* propertyNameText(propertyNode)
    const initializer = yield* variableDeclarationInitializer(variable)
    const memberPath = Array.of(memberName)

    return Tuple.make(initializer, memberPath)
  })

const aliasOriginFromDeclaration = (declaration: ts.Declaration) =>
  pipe(
    variableAliasOrigin(declaration),
    Option.orElse(() => bindingAliasOrigin(declaration)),
    Option.toArray
  )

const aliasOrigins = flow(declarationsOfSymbol, Array.flatMap(aliasOriginFromDeclaration))

const effectGenNames = Array.of("gen")

const expressionReferencesEffectGen = (checker: ts.TypeChecker) => {
  const isEffectGenMember = effectApiMember("Effect")(effectGenNames)

  const makeImportedMember = (members: ReadonlyArray<string>) => (member: ImportedMember) => {
    const path = Array.appendAll(member.path, members)

    return new ImportedMember({ moduleSpecifier: member.moduleSpecifier, path })
  }

  const importedRootMatches = (members: ReadonlyArray<string>) => (identifier: ts.Identifier) =>
    pipe(
      importedMemberAt(checker)(identifier),
      Option.map(makeImportedMember(members)),
      Option.exists(isEffectGenMember)
    )

  const inspect =
    (seen: HashSet.HashSet<ts.Symbol>) =>
    (members: ReadonlyArray<string>) =>
    (expression: ts.Expression): boolean => {
      const current = unwrapEffectCarrier(expression)

      const inspectProperty = (access: ts.PropertyAccessExpression) => {
        const nextMembers = pipe(members, Array.prepend(access.name.text))

        return inspect(seen)(nextMembers)(access.expression)
      }

      const inspectElement = (access: ts.ElementAccessExpression) => {
        const memberName = pipe(
          Option.fromNullishOr(access.argumentExpression),
          Option.filter(ts.isStringLiteralLike),
          Option.map(Struct.get("text"))
        )

        const inspectMember = (name: string) => {
          const nextMembers = pipe(members, Array.prepend(name))

          return inspect(seen)(nextMembers)(access.expression)
        }

        return pipe(memberName, Option.exists(inspectMember))
      }

      const inspectIdentifier = (identifier: ts.Identifier) => {
        const imported = importedRootMatches(members)(identifier)
        const symbol = pipe(checker.getSymbolAtLocation(identifier), Option.fromNullishOr)
        const symbolWasSeen = (candidate: ts.Symbol) => HashSet.has(seen, candidate)
        const unseenSymbol = pipe(symbol, Option.filter(Predicate.not(symbolWasSeen)))

        const inspectOrigin = (candidate: ts.Symbol) => {
          const nextSeen = HashSet.add(seen, candidate)

          const originMatches = (origin: readonly [ts.Expression, ReadonlyArray<string>]) => {
            const originExpression = Tuple.get(origin, 0)
            const originMembers = Tuple.get(origin, 1)
            const nextMembers = Array.appendAll(originMembers, members)

            return inspect(nextSeen)(nextMembers)(originExpression)
          }

          return pipe(aliasOrigins(candidate), Array.some(originMatches))
        }

        const aliased = pipe(unseenSymbol, Option.exists(inspectOrigin))

        return imported || aliased
      }

      return pipe(
        Match.value(current),
        Match.when(ts.isPropertyAccessExpression, inspectProperty),
        Match.when(ts.isElementAccessExpression, inspectElement),
        Match.when(ts.isIdentifier, inspectIdentifier),
        Match.orElse(Function.constFalse)
      )
    }

  return inspect(noSymbols)(noStrings)
}

const sameFunctionDefinition = Equivalence.strictEqual<ts.SignatureDeclaration>()

const ownedSymbolInitializers = (owner: FunctionDefinition) => (symbol: ts.Symbol) => {
  const initializerOwnedByFunction = (declaration: ts.Declaration) => {
    const ancestor = ts.findAncestor(declaration, ts.isFunctionLike)
    const functionOwner = pipe(ancestor, Option.fromNullishOr)

    const ownerMatches = (candidate: ts.SignatureDeclaration) =>
      sameFunctionDefinition(candidate, owner)

    return pipe(
      functionOwner,
      Option.filter(ownerMatches),
      Option.as(declaration),
      Option.flatMap(constVariableInitializer)
    )
  }

  return pipe(
    declarationsOfSymbol(symbol),
    Array.flatMap(flow(initializerOwnedByFunction, Option.toArray))
  )
}

const effectGenCallFromExpression = (checker: ts.TypeChecker) => (owner: FunctionDefinition) => {
  const referencesEffectGen = expressionReferencesEffectGen(checker)

  const inspect =
    (seen: HashSet.HashSet<ts.Symbol>) =>
    (expression: ts.Expression): Option.Option<ts.CallExpression> => {
      const current = unwrapEffectCarrier(expression)

      const inspectCall = (call: ts.CallExpression) =>
        pipe(call, Option.liftPredicate(flow(Struct.get("expression"), referencesEffectGen)))

      const inspectConditional = (conditional: ts.ConditionalExpression) =>
        pipe(
          inspect(seen)(conditional.whenTrue),
          Option.orElse(() => inspect(seen)(conditional.whenFalse))
        )

      const inspectIdentifier = (identifier: ts.Identifier) => {
        const symbol = pipe(checker.getSymbolAtLocation(identifier), Option.fromNullishOr)
        const symbolWasSeen = (candidate: ts.Symbol) => HashSet.has(seen, candidate)
        const unseenSymbol = pipe(symbol, Option.filter(Predicate.not(symbolWasSeen)))

        const inspectInitializers = (candidate: ts.Symbol) => {
          const nextSeen = HashSet.add(seen, candidate)
          const inspectInitializer = inspect(nextSeen)

          return pipe(
            ownedSymbolInitializers(owner)(candidate),
            Array.map(inspectInitializer),
            Option.firstSomeOf
          )
        }

        return pipe(unseenSymbol, Option.flatMap(inspectInitializers))
      }

      return pipe(
        Match.value(current),
        Match.when(ts.isCallExpression, inspectCall),
        Match.when(ts.isConditionalExpression, inspectConditional),
        Match.when(ts.isIdentifier, inspectIdentifier),
        Match.orElse(Option.none as () => Option.Option<ts.CallExpression>)
      )
    }

  return inspect(noSymbols)
}

export const functionReturnsEffectGen =
  (checker: ts.TypeChecker) => (declaration: FunctionDefinition) => {
    const inspectCandidate = (candidate: FunctionDefinition) => {
      const effectGenCall = effectGenCallFromExpression(checker)(candidate)

      return pipe(resultExpressions(candidate), Array.map(effectGenCall), Option.firstSomeOf)
    }

    return pipe(
      declaration,
      Option.liftPredicate(isEffectReturningFunction),
      Option.flatMap(inspectCandidate)
    )
  }

const functionDefinitionFromVariable = (declaration: ts.VariableDeclaration) =>
  pipe(
    variableDeclarationInitializer(declaration),
    Option.map(unwrapEffectCarrier),
    Option.filter(isFunctionDefinition)
  )

const functionDefinitionFromDeclaration = (declaration: ts.Declaration) => {
  const direct = Option.liftPredicate(isFunctionDefinition)(declaration)

  const fromVariable = pipe(
    declaration,
    Option.liftPredicate(ts.isVariableDeclaration),
    Option.flatMap(functionDefinitionFromVariable)
  )

  return pipe(direct, Option.orElse(Function.constant(fromVariable)))
}

const functionDefinitionArrayFromDeclaration = flow(
  functionDefinitionFromDeclaration,
  Option.toArray
)

const functionDefinitionsFromDeclarations = (declarations: ReadonlyArray<ts.Declaration>) =>
  Array.flatMap(declarations, functionDefinitionArrayFromDeclaration)

const noFunctionDefinitions: ReadonlyArray<FunctionDefinition> = Array.empty()

const oneFunctionDefinition = Array.of<FunctionDefinition>

const functionDefinitionsForExpression =
  (checker: ts.TypeChecker) => (expression: ts.Expression) => {
    const current = unwrapEffectCarrier(expression)

    const definitionsForIdentifier = flow(
      checker.getSymbolAtLocation.bind(checker),
      Option.fromNullishOr,
      Option.map(declarationsOfSymbol),
      Option.map(functionDefinitionsFromDeclarations),
      Option.getOrElse(Function.constant(noFunctionDefinitions))
    )

    const directDefinitions = pipe(
      current,
      Option.liftPredicate(isFunctionDefinition),
      Option.map(oneFunctionDefinition),
      Option.getOrElse(Function.constant(noFunctionDefinitions))
    )

    const identifierDefinitions = pipe(
      current,
      Option.liftPredicate(ts.isIdentifier),
      Option.map(definitionsForIdentifier),
      Option.getOrElse(Function.constant(noFunctionDefinitions))
    )

    return Array.appendAll(directDefinitions, identifierDefinitions)
  }

export const expressionIsFunctionReturningEffectGen =
  (checker: ts.TypeChecker) => (expression: ts.Expression) => {
    const returnsEffectGen = flow(functionReturnsEffectGen(checker), Option.isSome)

    return pipe(functionDefinitionsForExpression(checker)(expression), Array.some(returnsEffectGen))
  }
