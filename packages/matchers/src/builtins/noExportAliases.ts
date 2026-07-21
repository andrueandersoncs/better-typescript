import { Array, Option, Schema, pipe } from "effect"
import * as ts from "typescript"
import { fileMatcher } from "@better-typescript/matchers/matcher"
import { makeNodeMatch, type MatchContext } from "@better-typescript/matchers/matcher/data"
import { hasExportModifier } from "../support/tsNode.js"

// NoExportAliasesFact is empty payload because the alias syntax identifies the finding.
export const NoExportAliasesFact = Schema.Struct({})

export interface NoExportAliasesFact extends Schema.Schema.Type<typeof NoExportAliasesFact> {}

// emptyNoExportAliasesFact is shared because every alias has the same guidance.
export const emptyNoExportAliasesFact = NoExportAliasesFact.make({})

const isExportedConstStatement = (statement: ts.Statement): statement is ts.VariableStatement =>
  pipe(
    Option.liftPredicate(ts.isVariableStatement)(statement),
    Option.filter(hasExportModifier),
    Option.filter((variable) => (variable.declarationList.flags & ts.NodeFlags.Const) !== 0),
    Option.isSome
  )

const isIdentifierInitializer = (declaration: ts.VariableDeclaration) =>
  pipe(Option.fromNullishOr(declaration.initializer), Option.exists(ts.isIdentifier))

const isIdentifierAlias = (declaration: ts.VariableDeclaration) => {
  const named = ts.isIdentifier(declaration.name)
  const identifierInitializer = isIdentifierInitializer(declaration)

  return named && identifierInitializer
}

const makeAliasMatch = (declaration: ts.VariableDeclaration) =>
  makeNodeMatch(declaration, emptyNoExportAliasesFact)

const exportAliasMatches = (context: MatchContext) =>
  pipe(
    context.sourceFile.statements,
    Array.filter(isExportedConstStatement),
    Array.flatMap((statement) => statement.declarationList.declarations),
    Array.filter(isIdentifierAlias),
    Array.map(makeAliasMatch)
  )

export const noExportAliasesMatcher = fileMatcher(exportAliasMatches)
