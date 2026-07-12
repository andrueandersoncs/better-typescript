import { Array, Function, HashSet, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { fileCheck } from "@better-typescript/core/engine/check"
import {
  functionInitializer,
  isExtendsClause,
  namedDetectionTarget
} from "./support/tsNode.js"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { MakeDetection } from "@better-typescript/core/engine/location"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"
import { fixtureRefactorExamples } from "../fixtureExamples.js"

const message =
  "Avoid defining data structures in the same file as functions/algorithms."

const hint =
  "Move data structures (Schema.Class, Data.Class, interfaces, object type aliases) into their " +
  "own dedicated file. When they share a concept with algorithms, create a directory named for " +
  "that concept and keep the data-structure file and algorithm file side by side."

const dataStructureMemberNames = HashSet.make(
  "Class",
  "TaggedClass",
  "TaggedError",
  "TaggedRequest"
)

const dataStructureNamespaces = HashSet.make("Schema", "Data")

type DataStructureDeclaration =
  ts.ClassDeclaration | ts.InterfaceDeclaration | ts.TypeAliasDeclaration

const unwrapCallee = (expression: ts.Expression): ts.Expression => {
  const call = Option.liftPredicate(ts.isCallExpression)(expression)

  return Option.match(call, {
    onNone: Function.constant(expression),
    onSome: (node) => unwrapCallee(node.expression)
  })
}

const propertyAccessIsDataStructure = (
  access: ts.PropertyAccessExpression
): boolean => {
  const memberName = access.name.text
  const isKnownMember = HashSet.has(dataStructureMemberNames, memberName)
  const namespace = Option.liftPredicate(ts.isIdentifier)(access.expression)
  const namespaceName = Option.map(namespace, Struct.get("text"))

  const isKnownNamespace = Option.exists(namespaceName, (name) =>
    HashSet.has(dataStructureNamespaces, name)
  )

  return Array.every([isKnownMember, isKnownNamespace], Boolean)
}

const heritageExtendsDataStructure = (
  type: ts.ExpressionWithTypeArguments
): boolean => {
  const unwrapped = unwrapCallee(type.expression)
  const access = Option.liftPredicate(ts.isPropertyAccessExpression)(unwrapped)

  return Option.exists(access, propertyAccessIsDataStructure)
}

const classDeclarationIsDataStructure = (
  declaration: ts.ClassDeclaration
): boolean => {
  const clauses = declaration.heritageClauses ?? []
  const extendsClause = Array.findFirst(clauses, isExtendsClause)

  return Option.exists(extendsClause, (clause) =>
    Array.some(clause.types, heritageExtendsDataStructure)
  )
}

const typeAliasIsObjectDataStructure = (
  declaration: ts.TypeAliasDeclaration
): boolean => ts.isTypeLiteralNode(declaration.type)

const functionDeclarationHasName = (
  declaration: ts.FunctionDeclaration
): boolean => pipe(Option.fromNullable(declaration.name), Option.isSome)

const algorithmsInStatement = (
  statement: ts.Statement
): ReadonlyArray<ts.NamedDeclaration> => {
  const functionDeclaration = pipe(
    Option.liftPredicate(ts.isFunctionDeclaration)(statement),
    Option.filter(functionDeclarationHasName)
  )

  const fromFunction = Option.toArray(functionDeclaration)

  const fromVariables = pipe(
    Option.liftPredicate(ts.isVariableStatement)(statement),
    Option.map((variableStatement) =>
      Array.filterMap(
        variableStatement.declarationList.declarations,
        (declaration) => {
          const initializer = functionInitializer(declaration)

          return Option.isSome(initializer)
            ? Option.some(declaration)
            : Option.none()
        }
      )
    ),
    Option.getOrElse(
      Function.constant([] as ReadonlyArray<ts.VariableDeclaration>)
    )
  )

  return Array.appendAll(fromFunction, fromVariables)
}

const dataStructureInStatement = (
  statement: ts.Statement
): Option.Option<DataStructureDeclaration> => {
  const asClass = pipe(
    Option.liftPredicate(ts.isClassDeclaration)(statement),
    Option.filter(classDeclarationIsDataStructure)
  )

  const asInterface = Option.liftPredicate(ts.isInterfaceDeclaration)(statement)

  const asObjectAlias = pipe(
    Option.liftPredicate(ts.isTypeAliasDeclaration)(statement),
    Option.filter(typeAliasIsObjectDataStructure)
  )

  return pipe(
    asClass,
    Option.orElse(Function.constant(asInterface)),
    Option.orElse(Function.constant(asObjectAlias))
  )
}

const dedicatedDataStructureFileMatches = (
  context: CheckContext
): ReadonlyArray<Detection> => {
  const match: MakeDetection = detection(context)
  const statements = context.sourceFile.statements
  const algorithms = Array.flatMap(statements, algorithmsInStatement)
  const dataStructures = Array.filterMap(statements, dataStructureInStatement)
  const hasAlgorithms = algorithms.length > 0
  const hasDataStructures = dataStructures.length > 0
  const shouldReport = Array.every([hasAlgorithms, hasDataStructures], Boolean)
  const empty: ReadonlyArray<Detection> = []

  return shouldReport
    ? Array.map(dataStructures, (declaration) => {
        const node = namedDetectionTarget(declaration)

        return match({
          node,
          message,
          hint
        })
      })
    : empty
}

export const preferDedicatedDataStructureFiles: Check = fileCheck(
  dedicatedDataStructureFileMatches
)

export const preferDedicatedDataStructureFilesExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("prefer-dedicated-data-structure-files")
