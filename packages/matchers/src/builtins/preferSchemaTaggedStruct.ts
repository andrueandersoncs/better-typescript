import { Array, Function, Option, pipe, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { nodeMatch, type MatchContext } from "../matcher/data.js"
import { namedDetectionTarget } from "../support/tsNode.js"
import { dataTaggedClassHeritage, typeIsWireSafe } from "../support/taggedClassPortability.js"
import { strictEqual } from "../equivalence.js"

// PreferSchemaTaggedStructFact is empty payload because guidance and matchers share identity.
export const PreferSchemaTaggedStructFact = Schema.Struct({})

export interface PreferSchemaTaggedStructFact extends Schema.Schema.Type<
  typeof PreferSchemaTaggedStructFact
> {}

// emptyPreferSchemaTaggedStructFact is empty payload because guidance and matchers share identity.
export const emptyPreferSchemaTaggedStructFact = PreferSchemaTaggedStructFact.make({})

const fieldsAreWireSafe = (checker: ts.TypeChecker) => (heritage: ts.ExpressionWithTypeArguments) =>
  pipe(
    Option.fromNullishOr(heritage.typeArguments),
    Option.getOrElse(Array.empty),
    Array.head,
    Option.match({
      onNone: Function.constant(true),
      onSome: (fieldsNode) => {
        const isEmptyLiteral = (literal: ts.TypeLiteralNode) =>
          strictEqual(0)(literal.members.length)

        return pipe(
          Option.liftPredicate(ts.isTypeLiteralNode)(fieldsNode),
          Option.filter(isEmptyLiteral),
          Option.match({
            onSome: Function.constant(true),
            onNone: () =>
              pipe(checker.getTypeFromTypeNode(fieldsNode), typeIsWireSafe(checker)(fieldsNode))
          })
        )
      }
    })
  )

const portableDataTaggedClassMatches = (context: MatchContext) => {
  const { checker } = context

  const matches = (declaration: ts.ClassDeclaration) =>
    pipe(
      dataTaggedClassHeritage(checker)(declaration),
      Option.filter(fieldsAreWireSafe(checker)),
      Option.map(() => {
        const target = namedDetectionTarget(declaration)
        const match = nodeMatch(target, emptyPreferSchemaTaggedStructFact)

        return match
      }),
      Option.toArray
    )

  return matches
}

const classDeclarationKinds = Array.of(ts.SyntaxKind.ClassDeclaration)

export const preferSchemaTaggedStructMatcher = nodeMatcher(classDeclarationKinds)(
  ts.isClassDeclaration
)(portableDataTaggedClassMatches)
