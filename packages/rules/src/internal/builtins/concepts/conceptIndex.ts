import {
  Array,
  Data,
  Function,
  HashMap,
  HashSet,
  Iterable,
  MutableList,
  Option,
  Order,
  Result,
  Struct,
  Tuple,
  flow,
  pipe,
  Match as EffectMatch
} from "effect"
import { strictEqual } from "../../equivalence.js"
import * as ts from "typescript"
import { astNodesIn } from "../../sources/astNodesIn.js"
import { isProjectSourceFile } from "../../sources/isProjectSourceFile.js"
import { makeLatestIdentityOwner } from "../../support/makeLatestIdentityOwner.js"
import type { ProgramMatchContext } from "../../scanner/programMatchContext.js"
import { classDeclarationName } from "../../support/classDeclarationName.js"
import { functionDeclarationName } from "../../support/functionDeclarationName.js"
import type { FunctionDefinition } from "../../support/functionDefinition.js"
import { functionInitializer } from "../../support/functionInitializer2.js"
import { hasExportModifier } from "../../support/hasExportModifier.js"
import { symbolDeclarations } from "../../support/symbolDeclarations.js"
import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"
import { unwrapCallee } from "../../support/unwrapCallee.js"
import { referenceKey } from "../../support/referenceKey.js"
import type { ReferenceKey } from "../../support/referenceKeyType.js"
import type { DataStructureDeclaration } from "./dataStructureDeclaration.js"
import type { ModelRole } from "./modelRole.js"
import { FunctionEntry } from "./functionEntry.js"
import { FieldRead } from "./fieldRead.js"
import { PassThroughConversion } from "./passThroughConversion.js"
import { ParameterBag } from "./parameterBag.js"
import { classDataForDeclaration } from "./effectClassData.js"
import { noneIdentifier } from "./noneIdentifier.js"
import { dataStructureEntryFromExpression } from "./dataStructureEntryFromExpression.js"
import { canonicalSymbol } from "../../support/canonicalSymbol.js"
import { symbolAt } from "./symbolAt.js"
import { runtimeSchemaType } from "./runtimeSchemaType.js"
import { unwrapParenthesizedType } from "./unwrapParenthesizedType.js"
import { compactTypeText } from "./compactTypeText.js"
import { nodeInside } from "./nodeInside.js"
import { setReplacingValue } from "./setReplacingValue.js"
import { modelFromResolvedType } from "./modelFromResolvedType.js"
import { returnedExpression } from "../../support/returnedExpression.js"

// DataStructureEntry exists because its fields form one stable data contract used by the linter.
export class DataStructureEntry extends Data.Class<{
  readonly symbol: ts.Symbol
  readonly declaration: DataStructureDeclaration
  readonly documentationNode: ts.Node
  readonly nameNode: ts.Identifier
  readonly name: string
  readonly sourceFile: ts.SourceFile
  readonly exported: boolean
  readonly shape: Option.Option<string>
  readonly fieldSymbols: ReadonlyArray<ts.Symbol>
}> {}

const noneTypeShape: Option.Option<string> = Option.none()
const inheritedErrorFieldNames = HashSet.make("cause", "message", "name", "stack")

const ignoredFieldNames = HashSet.make("pipe", "toJSON", "toString", "[TypeId]")

const invariantMemberNames = HashSet.make(
  "brand",
  "check",
  "checkEffect",
  "refine",
  "transform",
  "transformOrFail"
)

const emptyDataStructureEntries: ReadonlyArray<DataStructureEntry> = Array.empty()
const emptyVisitedSymbols: ReadonlyArray<ts.Symbol> = Array.empty()
const noneDeclarationName: Option.Option<ts.DeclarationName> = Option.none()
const noneObjectLiteral: Option.Option<ts.ObjectLiteralExpression> = Option.none()
const noneFunctionEntry: Option.Option<FunctionEntry> = Option.none()

const classIsDataStructure = (checker: ts.TypeChecker) => (declaration: ts.ClassDeclaration) =>
  pipe(classDataForDeclaration(checker)(emptyVisitedSymbols)(declaration), Option.isSome)

const interfaceCarriesData = (declaration: ts.InterfaceDeclaration) => {
  const hasDataMember = Array.some(declaration.members, (member) => {
    const isProperty = ts.isPropertySignature(member)
    const isIndex = ts.isIndexSignatureDeclaration(member)
    const dataMemberChecks = Array.make(isProperty, isIndex)

    return Array.some(dataMemberChecks, Boolean)
  })

  const hasHeritage = pipe(Option.fromNullishOr(declaration.heritageClauses), Option.isSome)
  const carriesDataChecks = Array.make(hasDataMember, hasHeritage)

  return Array.some(carriesDataChecks, Boolean)
}

const aliasCarriesData = (declaration: ts.TypeAliasDeclaration) => {
  const isFunction = ts.isFunctionTypeNode(declaration.type)
  const isConstructor = ts.isConstructorTypeNode(declaration.type)
  const exclusions = Array.make(isFunction, isConstructor)

  return Array.every(exclusions, (excluded) => !excluded)
}

const fieldIsMethod = (symbol: ts.Symbol) => {
  const declarations = symbolDeclarations(symbol) ?? Array.empty()

  return Array.some(declarations, (declaration) => {
    const isMethod = ts.isMethodDeclaration(declaration)
    const isMethodSignature = ts.isMethodSignature(declaration)
    const isGetAccessor = ts.isGetAccessorDeclaration(declaration)
    const isSetAccessor = ts.isSetAccessorDeclaration(declaration)
    const methodChecks = Array.make(isMethod, isMethodSignature, isGetAccessor, isSetAccessor)

    return Array.some(methodChecks, Boolean)
  })
}

const fieldIsDomainData = (symbol: ts.Symbol) => {
  const name = symbol.getName()
  const isInternal = name.startsWith("__")
  const isPhantomBrand = name.startsWith("~effect/")
  const isKnownMethod = HashSet.has(ignoredFieldNames, name)
  const isMethod = fieldIsMethod(symbol)
  const exclusions = Array.make(isInternal, isPhantomBrand, isKnownMethod, isMethod)

  return Array.every(exclusions, (excluded) => !excluded)
}

const declarationInProject = Function.flow(
  (declaration: ts.Declaration) => declaration.getSourceFile(),
  isProjectSourceFile
)

const fieldDeclaredInProject = (symbol: ts.Symbol) => {
  const declarations = symbolDeclarations(symbol) ?? Array.empty()

  return Array.some(declarations, declarationInProject)
}

const fieldsFor =
  (checker: ts.TypeChecker) =>
  (declaration: DataStructureDeclaration) =>
  (nameNode: ts.Identifier): ReadonlyArray<ts.Symbol> => {
    const type = checker.getTypeAtLocation(nameNode)
    const classDataFromDeclaration = classDataForDeclaration(checker)(emptyVisitedSymbols)

    const errorLike = pipe(
      Option.liftPredicate(ts.isClassDeclaration)(declaration),
      Option.flatMap(classDataFromDeclaration),
      Option.exists(Struct.get("errorLike"))
    )

    return pipe(
      type.getProperties(),
      Array.filter(fieldIsDomainData),
      Array.filter((field) => {
        const fieldName = field.getName()
        const knownErrorField = HashSet.has(inheritedErrorFieldNames, fieldName)
        const declaredInProject = fieldDeclaredInProject(field)
        const externalField = strictEqual(false)(declaredInProject)
        const inheritedErrorField = knownErrorField && externalField
        const keepErrorLike = strictEqual(false)(errorLike)
        const keepInheritedErrorField = strictEqual(false)(inheritedErrorField)
        const keepChecks = Array.make(keepErrorLike, keepInheritedErrorField)

        return Array.some(keepChecks, Boolean)
      })
    )
  }

const fieldTypeText = (checker: ts.TypeChecker) => (field: ts.Symbol) => {
  const declarations = field.declarations ?? Array.empty()

  const declaration = pipe(
    declarations,
    Array.head,
    Option.getOrElse(Function.constant(field.valueDeclaration))
  )

  const location = declaration ?? field.valueDeclaration
  const declaredType = checker.getDeclaredTypeOfSymbol(field)
  const typeOfFieldAt = (node: ts.Node) => checker.getTypeOfSymbolAtLocation(field, node)

  const type = pipe(
    Option.fromNullishOr(location),
    Option.map(typeOfFieldAt),
    Option.getOrElse(Function.constant(declaredType))
  )

  return checker.typeToString(type, location, ts.TypeFormatFlags.NoTruncation)
}

const declarationHasComparableShape = (declaration: DataStructureDeclaration) => {
  const isTypeLiteralAlias =
    ts.isTypeAliasDeclaration(declaration) && ts.isTypeLiteralNode(declaration.type)

  const isClass = ts.isClassDeclaration(declaration)
  const isInterface = ts.isInterfaceDeclaration(declaration)
  const shapeChecks = Array.make(isTypeLiteralAlias, isClass, isInterface)

  return Array.some(shapeChecks, Boolean)
}

const shapeFor =
  (checker: ts.TypeChecker) =>
  (fields: ReadonlyArray<ts.Symbol>): Option.Option<string> => {
    if (strictEqual(0)(fields.length)) {
      return Option.none()
    }

    const describe = fieldTypeText(checker)
    const fieldShapePart = (field: ts.Symbol) => `${field.getName()}:${describe(field)}`
    const parts = pipe(fields, Array.map(fieldShapePart), Array.sort(Order.String))

    return pipe(parts, Array.join("|"), Option.some)
  }

const flattenUnionMembers = (type: ts.TypeNode): ReadonlyArray<ts.TypeNode> => {
  const unwrapped = unwrapParenthesizedType(type)

  return ts.isUnionTypeNode(unwrapped)
    ? Array.flatMap(unwrapped.types, flattenUnionMembers)
    : Array.of(unwrapped)
}

const flattenIntersectionMembers = (type: ts.TypeNode): ReadonlyArray<ts.TypeNode> => {
  const unwrapped = unwrapParenthesizedType(type)

  return ts.isIntersectionTypeNode(unwrapped)
    ? Array.flatMap(unwrapped.types, flattenIntersectionMembers)
    : Array.of(unwrapped)
}

const unionStructureShape = (unionType: ts.UnionTypeNode) => {
  const membersText = (members: string) => `union:${members}`

  return pipe(
    flattenUnionMembers(unionType),
    Array.map(compactTypeText),
    Array.sort(Order.String),
    Array.join("|"),
    membersText,
    Option.some
  )
}

const intersectionStructureShape = (intersectionType: ts.IntersectionTypeNode) => {
  const membersText = (members: string) => `intersection:${members}`

  return pipe(
    flattenIntersectionMembers(intersectionType),
    Array.map(compactTypeText),
    Array.sort(Order.String),
    Array.join("&"),
    membersText,
    Option.some
  )
}

const tupleStructureShape = (tupleType: ts.TupleTypeNode) => {
  const membersText = (members: string) => `tuple:${members}`

  return pipe(
    Array.map(tupleType.elements, compactTypeText),
    Array.join(","),
    membersText,
    Option.some
  )
}

const structureShapeForAlias = (declaration: ts.TypeAliasDeclaration) =>
  pipe(
    declaration.type,
    unwrapParenthesizedType,
    EffectMatch.value,
    EffectMatch.when(ts.isUnionTypeNode, unionStructureShape),
    EffectMatch.when(ts.isIntersectionTypeNode, intersectionStructureShape),
    EffectMatch.when(ts.isTupleTypeNode, tupleStructureShape),
    EffectMatch.orElse(Function.constant(noneTypeShape))
  )

const shapeForDeclaration =
  (checker: ts.TypeChecker) =>
  (declaration: DataStructureDeclaration) =>
  (fieldSymbols: ReadonlyArray<ts.Symbol>) => {
    const fieldShape = declarationHasComparableShape(declaration)
      ? shapeFor(checker)(fieldSymbols)
      : Option.none<string>()

    const aliasShape = pipe(
      Option.liftPredicate(ts.isTypeAliasDeclaration)(declaration),
      Option.flatMap(structureShapeForAlias)
    )

    return pipe(fieldShape, Option.orElse(Function.constant(aliasShape)))
  }

const entryForDeclaration =
  (checker: ts.TypeChecker) =>
  (declaration: DataStructureDeclaration) =>
  (documentationNode: ts.Node) =>
  (nameNode: ts.Identifier) =>
  (exported: boolean) =>
    pipe(
      symbolAt(checker)(nameNode),
      Option.map((symbol) => {
        const fieldSymbols = fieldsFor(checker)(declaration)(nameNode)
        const shape = shapeForDeclaration(checker)(declaration)(fieldSymbols)
        const sourceFile = nameNode.getSourceFile()

        return new DataStructureEntry({
          symbol,
          declaration,
          documentationNode,
          nameNode,
          name: nameNode.text,
          sourceFile,
          exported,
          shape,
          fieldSymbols
        })
      })
    )

const isNamedDataClass =
  (checker: ts.TypeChecker): ((statement: ts.Statement) => statement is ts.ClassDeclaration) =>
  (statement): statement is ts.ClassDeclaration => {
    const namedClassDeclaration = (declaration: ts.ClassDeclaration) =>
      pipe(classDeclarationName(declaration), Option.as(declaration))

    return pipe(
      Option.liftPredicate(ts.isClassDeclaration)(statement),
      Option.flatMap(namedClassDeclaration),
      Option.filter(classIsDataStructure(checker)),
      Option.isSome
    )
  }

const isDataInterface = (statement: ts.Statement): statement is ts.InterfaceDeclaration => {
  const isInterface = ts.isInterfaceDeclaration(statement)

  return isInterface && interfaceCarriesData(statement)
}

const isDataTypeAlias = (statement: ts.Statement): statement is ts.TypeAliasDeclaration => {
  const isAlias = ts.isTypeAliasDeclaration(statement)

  return isAlias && aliasCarriesData(statement)
}

const declarationEntriesForStatement =
  (checker: ts.TypeChecker) =>
  (statement: ts.Statement): ReadonlyArray<DataStructureEntry> => {
    const exported = hasExportModifier(statement)

    const entriesFor = (declaration: DataStructureDeclaration) => (nameNode: ts.Identifier) =>
      pipe(entryForDeclaration(checker)(declaration)(statement)(nameNode)(exported), Option.toArray)

    const namedDataClassEntries = (declaration: ts.ClassDeclaration) => {
      const entriesForNamedClass = entriesFor(declaration)

      return pipe(
        classDeclarationName(declaration),
        Option.map(entriesForNamedClass),
        Option.getOrElse(Function.constant(emptyDataStructureEntries))
      )
    }

    const namedInterfaceEntries = (declaration: ts.InterfaceDeclaration) =>
      flow(
        Struct.get<ts.InterfaceDeclaration, "name">("name"),
        entriesFor(declaration)
      )(declaration)

    const namedAliasEntries = (declaration: ts.TypeAliasDeclaration) =>
      flow(
        Struct.get<ts.TypeAliasDeclaration, "name">("name"),
        entriesFor(declaration)
      )(declaration)

    const namedEnumEntries = (declaration: ts.EnumDeclaration) =>
      flow(Struct.get<ts.EnumDeclaration, "name">("name"), entriesFor(declaration))(declaration)

    const namedDeclarationEntries = pipe(
      EffectMatch.value(statement),
      EffectMatch.when(isNamedDataClass(checker), namedDataClassEntries),
      EffectMatch.when(isDataInterface, namedInterfaceEntries),
      EffectMatch.when(isDataTypeAlias, namedAliasEntries),
      EffectMatch.when(ts.isEnumDeclaration, namedEnumEntries),
      EffectMatch.orElse(Function.constant(emptyDataStructureEntries))
    )

    if (namedDeclarationEntries.length > 0) {
      return namedDeclarationEntries
    }

    const isExportedVariable = ts.isVariableStatement(statement) && exported

    if (!isExportedVariable) {
      return Array.empty()
    }

    const runtimeSchemaEntry = (declaration: ts.VariableDeclaration) => {
      const entryForName = Function.flip(entryForDeclaration(checker)(declaration)(statement))(
        exported
      )

      return pipe(
        Option.liftPredicate(ts.isIdentifier)(declaration.name),
        Option.filter(() => runtimeSchemaType(checker)(declaration)),
        Option.flatMap(entryForName),
        Result.fromOption(Function.constVoid)
      )
    }

    return Array.filterMap(statement.declarationList.declarations, runtimeSchemaEntry)
  }

const entriesFromSourceFile =
  (checker: ts.TypeChecker) =>
  (sourceFile: ts.SourceFile): ReadonlyArray<DataStructureEntry> => {
    const entriesForStatement = declarationEntriesForStatement(checker)

    return Array.flatMap(sourceFile.statements, entriesForStatement)
  }

const dataStructureEntries =
  (checker: ts.TypeChecker) =>
  (program: ts.Program): ReadonlyArray<DataStructureEntry> => {
    const programSourceFiles = program.getSourceFiles()
    const sourceFiles = pipe(programSourceFiles, Array.filter(isProjectSourceFile))
    const declarations = Array.flatMap(sourceFiles, entriesFromSourceFile(checker))

    return Array.dedupeWith(declarations, (first, second) =>
      strictEqual(second.symbol)(first.symbol)
    )
  }

const functionEntryForDeclaration =
  (checker: ts.TypeChecker) => (declaration: ts.FunctionDeclaration) => {
    const entryForName = (nameNode: ts.Identifier) =>
      pipe(
        symbolAt(checker)(nameNode),
        Option.map((symbol) => {
          const scan = Option.some(declaration)
          const sourceFile = declaration.getSourceFile()
          const exported = hasExportModifier(declaration)

          return new FunctionEntry({
            symbol,
            scan,
            nameNode,
            name: nameNode.text,
            sourceFile,
            exported
          })
        })
      )

    return pipe(functionDeclarationName(declaration), Option.flatMap(entryForName))
  }

const functionEntryForVariable =
  (checker: ts.TypeChecker) =>
  (exported: boolean) =>
  (dataBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>) =>
  (declaration: ts.VariableDeclaration) => {
    const entryForName = (nameNode: ts.Identifier) =>
      pipe(
        symbolAt(checker)(nameNode),
        Option.filter((symbol) => {
          const symbolKey = referenceKey(symbol)

          return !HashMap.has(dataBySymbol, symbolKey)
        }),
        Option.filter(() => {
          const type = checker.getTypeAtLocation(nameNode)

          return type.getCallSignatures().length > 0
        }),
        Option.map((symbol) => {
          const scan = functionInitializer(declaration)
          const sourceFile = declaration.getSourceFile()

          return new FunctionEntry({
            symbol,
            scan,
            nameNode,
            name: nameNode.text,
            sourceFile,
            exported
          })
        })
      )

    return pipe(
      Option.liftPredicate(ts.isIdentifier)(declaration.name),
      Option.flatMap(entryForName)
    )
  }

const functionEntryForMethod = (checker: ts.TypeChecker) => (declaration: ts.MethodDeclaration) => {
  const entryForName = (nameNode: ts.Identifier) =>
    pipe(
      symbolAt(checker)(nameNode),
      Option.map((symbol) => {
        const scan = Option.some(declaration)
        const sourceFile = declaration.getSourceFile()

        return new FunctionEntry({
          symbol,
          scan,
          nameNode,
          name: nameNode.text,
          sourceFile,
          exported: false
        })
      })
    )

  return pipe(Option.liftPredicate(ts.isIdentifier)(declaration.name), Option.flatMap(entryForName))
}

const functionEntries =
  (checker: ts.TypeChecker) =>
  (program: ts.Program) =>
  (
    dataBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>
  ): ReadonlyArray<FunctionEntry> => {
    const sourceFiles = pipe(program.getSourceFiles(), Array.filter(isProjectSourceFile))

    const entriesFromSourceFile = (sourceFile: ts.SourceFile) => {
      const functionEntryFromNode = (node: ts.Node) => {
        const variableEntry = (declaration: ts.VariableDeclaration) => {
          const isVariableStatement = ts.isVariableStatement(declaration.parent.parent)
          const exported = isVariableStatement && hasExportModifier(declaration.parent.parent)

          return functionEntryForVariable(checker)(exported)(dataBySymbol)(declaration)
        }

        const entryForFunctionDeclaration = functionEntryForDeclaration(checker)
        const entryForMethodDeclaration = functionEntryForMethod(checker)

        return pipe(
          EffectMatch.value(node),
          EffectMatch.when(ts.isFunctionDeclaration, entryForFunctionDeclaration),
          EffectMatch.when(ts.isMethodDeclaration, entryForMethodDeclaration),
          EffectMatch.when(ts.isVariableDeclaration, variableEntry),
          EffectMatch.orElse(Function.constant(noneFunctionEntry)),
          Result.fromOption(Function.constVoid)
        )
      }

      return pipe(
        astNodesIn(sourceFile),
        Array.fromIterable,
        Array.filterMap(functionEntryFromNode)
      )
    }

    return Array.flatMap(sourceFiles, entriesFromSourceFile)
  }

const addOwner =
  (index: HashMap.HashMap<ReferenceKey<ts.Symbol>, HashSet.HashSet<ReferenceKey<ts.Symbol>>>) =>
  (target: ts.Symbol) =>
  (
    owner: ts.Symbol
  ): HashMap.HashMap<ReferenceKey<ts.Symbol>, HashSet.HashSet<ReferenceKey<ts.Symbol>>> => {
    const targetKey = referenceKey(target)
    const ownerKey = referenceKey(owner)
    const existing = HashMap.get(index, targetKey)
    const owners = pipe(existing, Option.getOrElse(HashSet.empty))
    const updatedOwners = HashSet.add(owners, ownerKey)

    HashMap.set(index, targetKey, updatedOwners)

    return index
  }

const pairWithParent = (current: ts.Node) => {
  const withParent = (parent: ts.Node) => Tuple.make(current, parent)

  return pipe(Option.fromNullishOr(current.parent), Option.map(withParent))
}

const isTopLevelStatement = (candidate: ts.Node): candidate is ts.Statement =>
  ts.isSourceFile(candidate.parent) && ts.isStatement(candidate)

const topLevelStatement = (node: ts.Node) =>
  pipe(
    Iterable.unfold<ts.Node, ts.Node>(node, pairWithParent),
    Iterable.findFirst(isTopLevelStatement)
  )

const isNamedTopLevelDeclaration = (
  statement: ts.Statement
): statement is
  | ts.FunctionDeclaration
  | ts.ClassDeclaration
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration
  | ts.EnumDeclaration => {
  const isFunction = ts.isFunctionDeclaration(statement)
  const isClass = ts.isClassDeclaration(statement)
  const isInterface = ts.isInterfaceDeclaration(statement)
  const isAlias = ts.isTypeAliasDeclaration(statement)
  const isEnum = ts.isEnumDeclaration(statement)
  const namedChecks = Array.make(isFunction, isClass, isInterface, isAlias, isEnum)

  return Array.some(namedChecks, Boolean)
}

const variableStatementOwnerName = (node: ts.Node) => (variableStatement: ts.VariableStatement) =>
  pipe(
    variableStatement.declarationList.declarations,
    Array.findFirst(nodeInside(node)),
    Option.map(Struct.get("name"))
  )

const namedTopLevelDeclarationName = (
  declaration:
    | ts.FunctionDeclaration
    | ts.ClassDeclaration
    | ts.InterfaceDeclaration
    | ts.TypeAliasDeclaration
    | ts.EnumDeclaration
) => Option.fromNullishOr(declaration.name)

const statementOwnerName =
  (node: ts.Node) =>
  (statement: ts.Statement): Option.Option<ts.DeclarationName> =>
    pipe(
      EffectMatch.value(statement),
      EffectMatch.when(ts.isVariableStatement, variableStatementOwnerName(node)),
      EffectMatch.when(isNamedTopLevelDeclaration, namedTopLevelDeclarationName),
      EffectMatch.orElse(Function.constant(noneDeclarationName))
    )

const namedDeclarationIdentifier = (declaration: ts.FunctionDeclaration | ts.MethodDeclaration) =>
  pipe(Option.fromNullishOr(declaration.name), Option.filter(ts.isIdentifier))

const namedFunctionOrMethodName = (node: ts.Node) =>
  pipe(
    EffectMatch.value(node),
    EffectMatch.when(ts.isFunctionDeclaration, namedDeclarationIdentifier),
    EffectMatch.when(ts.isMethodDeclaration, namedDeclarationIdentifier),
    EffectMatch.orElse(Function.constant(noneIdentifier))
  )

const expressionFunctionOwnerName = (node: ts.ArrowFunction | ts.FunctionExpression) => {
  const functionExpressionName = (expression: ts.FunctionExpression) =>
    Option.fromNullishOr(expression.name)

  const namedExpression = pipe(
    Option.liftPredicate(ts.isFunctionExpression)(node),
    Option.flatMap(functionExpressionName)
  )

  const fromVariable = pipe(
    Option.liftPredicate(ts.isVariableDeclaration)(node.parent),
    Option.map(Struct.get("name")),
    Option.filter(ts.isIdentifier)
  )

  return pipe(namedExpression, Option.orElse(Function.constant(fromVariable)))
}

const functionOwnerName = (node: ts.Node) => {
  const expressionOwner = pipe(
    EffectMatch.value(node),
    EffectMatch.when(ts.isArrowFunction, expressionFunctionOwnerName),
    EffectMatch.when(ts.isFunctionExpression, expressionFunctionOwnerName),
    EffectMatch.orElse(Function.constant(noneIdentifier))
  )

  return pipe(namedFunctionOrMethodName(node), Option.orElse(Function.constant(expressionOwner)))
}

const functionOwnerFrom =
  (checker: ts.TypeChecker) =>
  (functionBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, FunctionEntry>) =>
  (current: ts.Node): Option.Option<ts.Symbol> =>
    pipe(
      functionOwnerName(current),
      Option.flatMap(symbolAt(checker)),
      Option.filter((symbol) => {
        const symbolKey = referenceKey(symbol)

        return HashMap.has(functionBySymbol, symbolKey)
      }),
      // The orElse stays lazy because the parent walk is recursive and must not run eagerly.
      Option.orElse(() =>
        pipe(
          Option.fromNullishOr(current.parent),
          Option.flatMap(functionOwnerFrom(checker)(functionBySymbol))
        )
      )
    )

const topLevelOwnerSymbol = (checker: ts.TypeChecker) => (node: ts.Node) => {
  const ownerNameFromStatement = statementOwnerName(node)

  return pipe(
    topLevelStatement(node),
    Option.flatMap(ownerNameFromStatement),
    Option.flatMap(symbolAt(checker))
  )
}

const ownerSymbol =
  (checker: ts.TypeChecker) =>
  (functionBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, FunctionEntry>) =>
  (node: ts.Node) => {
    const topLevelOwner = topLevelOwnerSymbol(checker)(node)

    return pipe(
      Option.fromNullishOr(node.parent),
      Option.flatMap(functionOwnerFrom(checker)(functionBySymbol)),
      Option.orElse(Function.constant(topLevelOwner))
    )
  }

const declarationNameIs = (node: ts.Identifier) => (entry: DataStructureEntry | FunctionEntry) =>
  strictEqual(entry.nameNode)(node)

const fieldEntries = (
  entry: DataStructureEntry
): ReadonlyArray<readonly [ReferenceKey<ts.Symbol>, DataStructureEntry]> =>
  Array.map(entry.fieldSymbols, (field) => {
    const fieldKey = referenceKey(field)

    return Tuple.make(fieldKey, entry)
  })

const addFieldModel = (
  index: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>,
  entry: readonly [ReferenceKey<ts.Symbol>, DataStructureEntry]
): HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry> => {
  const key = Tuple.get(entry, 0)
  const value = Tuple.get(entry, 1)

  return setReplacingValue(key)(index)(value)
}

const emptyDataBySymbol = HashMap.empty<ReferenceKey<ts.Symbol>, DataStructureEntry>()

const addDataStructureEntry = (
  index: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>,
  entry: DataStructureEntry
): HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry> => {
  const key = referenceKey(entry.symbol)

  return setReplacingValue(key)(index)(entry)
}

const emptyFunctionBySymbol = HashMap.empty<ReferenceKey<ts.Symbol>, FunctionEntry>()

const addFunctionEntry = (
  index: HashMap.HashMap<ReferenceKey<ts.Symbol>, FunctionEntry>,
  entry: FunctionEntry
): HashMap.HashMap<ReferenceKey<ts.Symbol>, FunctionEntry> => {
  const key = referenceKey(entry.symbol)

  return setReplacingValue(key)(index)(entry)
}

const fieldModelIndex = (
  dataStructures: ReadonlyArray<DataStructureEntry>
): HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry> => {
  const entries = Array.flatMap(dataStructures, fieldEntries)
  const emptyIndex = HashMap.empty<ReferenceKey<ts.Symbol>, DataStructureEntry>()

  return Array.reduce(entries, emptyIndex, addFieldModel)
}

const propertyAccessParent = (identifier: ts.Identifier) =>
  Option.liftPredicate(ts.isPropertyAccessExpression)(identifier.parent)

const mechanicalForwardingPair = (access: ts.PropertyAccessExpression) => {
  const pairWithAccess = (assignment: ts.PropertyAssignment) => Tuple.make(access, assignment)

  const assignmentInitializesAccess = flow(
    Struct.get<ts.PropertyAssignment, "initializer">("initializer"),
    strictEqual(access)
  )

  return pipe(
    Option.liftPredicate(ts.isPropertyAssignment)(access.parent),
    Option.filter(assignmentInitializesAccess),
    Option.map(pairWithAccess)
  )
}

const mechanicalForwardingRead = (node: ts.Node) =>
  pipe(
    Option.liftPredicate(ts.isIdentifier)(node),
    Option.flatMap(propertyAccessParent),
    Option.flatMap(mechanicalForwardingPair),
    Option.exists((pair) => {
      const access = Tuple.get(pair, 0)
      const assignment = Tuple.get(pair, 1)
      const assignmentName = assignment.name.getText()

      return strictEqual(access.name.text)(assignmentName)
    })
  )

const dataFromNode =
  (checker: ts.TypeChecker) =>
  (dataBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>) =>
  (node: ts.Node) =>
    pipe(checker.getTypeAtLocation(node), modelFromResolvedType(checker)(dataBySymbol))

const modelsFromResolvedType =
  (checker: ts.TypeChecker) =>
  (dataBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>) =>
  (type: ts.Type): ReadonlyArray<DataStructureEntry> => {
    const direct = pipe(type, modelFromResolvedType(checker)(dataBySymbol), Option.toArray)

    if (direct.length > 0) {
      return direct
    }

    if (!type.isUnionOrIntersection()) {
      return Array.empty()
    }

    const modelsFromMember = modelsFromResolvedType(checker)(dataBySymbol)

    return Array.flatMap(type.types, modelsFromMember)
  }

const fieldReferences =
  (checker: ts.TypeChecker) =>
  (dataBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>) =>
  (fields: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>) =>
  (node: ts.Identifier) =>
  (symbol: ts.Symbol): ReadonlyArray<readonly [DataStructureEntry, ts.Symbol]> => {
    const symbolKey = referenceKey(symbol)
    const direct = HashMap.get(fields, symbolKey)

    if (Option.isSome(direct)) {
      const reference = Tuple.make(direct.value, symbol)

      return Array.make(reference)
    }

    const accessNameIsNode = flow(
      Struct.get<ts.PropertyAccessExpression, "name">("name"),
      strictEqual(node)
    )

    const propertyAccess = pipe(
      Option.liftPredicate(ts.isPropertyAccessExpression)(node.parent),
      Option.filter(accessNameIsNode)
    )

    if (Option.isNone(propertyAccess)) {
      return Array.empty()
    }

    const receiverType = checker.getTypeAtLocation(propertyAccess.value.expression)
    const models = modelsFromResolvedType(checker)(dataBySymbol)(receiverType)

    const fieldReferenceForModel = (model: DataStructureEntry) => {
      const pairWithModel = (field: ts.Symbol) => Tuple.make(model, field)
      const fieldNamedLikeNode = flow((field: ts.Symbol) => field.getName(), strictEqual(node.text))

      return pipe(
        model.fieldSymbols,
        Array.findFirst(fieldNamedLikeNode),
        Option.map(pairWithModel),
        Result.fromOption(Function.constVoid)
      )
    }

    return Array.filterMap(models, fieldReferenceForModel)
  }

const objectLiteralArgument = (expression: ts.NewExpression | ts.CallExpression) =>
  pipe(
    Option.fromNullishOr(expression.arguments),
    Option.getOrElse(Array.empty),
    Array.head,
    Option.map(unwrapTransparentExpression),
    Option.filter(ts.isObjectLiteralExpression)
  )

const constructionObject = (expression: ts.Expression) =>
  pipe(
    unwrapTransparentExpression(expression),
    EffectMatch.value,
    EffectMatch.when(ts.isObjectLiteralExpression, Option.some<ts.ObjectLiteralExpression>),
    EffectMatch.when(ts.isNewExpression, objectLiteralArgument),
    EffectMatch.when(ts.isCallExpression, objectLiteralArgument),
    EffectMatch.orElse(Function.constant(noneObjectLiteral))
  )

const spreadCopiesParameter = (parameter: ts.Identifier) => (property: ts.SpreadAssignment) => {
  const identifierMatchesParameter = flow(
    Struct.get<ts.Identifier, "text">("text"),
    strictEqual(parameter.text)
  )

  return pipe(
    unwrapTransparentExpression(property.expression),
    Option.liftPredicate(ts.isIdentifier),
    Option.exists(identifierMatchesParameter)
  )
}

const assignmentCopiesParameter =
  (parameter: ts.Identifier) => (property: ts.PropertyAssignment) => {
    const identifierMatchesParameter = flow(
      Struct.get<ts.Identifier, "text">("text"),
      strictEqual(parameter.text)
    )

    return pipe(
      unwrapTransparentExpression(property.initializer),
      Option.some,
      Option.filter(ts.isPropertyAccessExpression),
      Option.exists((initializer) => {
        const receiver = unwrapTransparentExpression(initializer.expression)

        const isParameter = pipe(
          Option.liftPredicate(ts.isIdentifier)(receiver),
          Option.exists(identifierMatchesParameter)
        )

        const propertyName = property.name.getText()
        const sameField = strictEqual(initializer.name.text)(propertyName)
        const copyChecks = Array.make(isParameter, sameField)

        return Array.every(copyChecks, Boolean)
      })
    )
  }

const propertyCopiesParameter =
  (parameter: ts.Identifier) => (property: ts.ObjectLiteralElementLike) => {
    const spreadCopies = spreadCopiesParameter(parameter)
    const assignmentCopies = assignmentCopiesParameter(parameter)

    return pipe(
      EffectMatch.value(property),
      EffectMatch.when(ts.isSpreadAssignment, spreadCopies),
      EffectMatch.when(ts.isPropertyAssignment, assignmentCopies),
      EffectMatch.orElse(Function.constFalse)
    )
  }

const parameterModel =
  (scan: FunctionDefinition) =>
  (checker: ts.TypeChecker) =>
  (
    dataBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>
  ): Option.Option<readonly [ts.Identifier, DataStructureEntry]> => {
    const modelForParameter = (parameter: ts.ParameterDeclaration) => {
      const pairWithName = (parameterName: ts.Identifier) => {
        const pairWithParameterName = (parameterModelEntry: DataStructureEntry) =>
          Tuple.make(parameterName, parameterModelEntry)

        return pipe(
          dataFromNode(checker)(dataBySymbol)(parameter),
          Option.map(pairWithParameterName)
        )
      }

      return pipe(
        Option.liftPredicate(ts.isIdentifier)(parameter.name),
        Option.flatMap(pairWithName),
        Result.fromOption(Function.constVoid)
      )
    }

    const models = Array.filterMap(scan.parameters, modelForParameter)
    const hasSingleModel = strictEqual(1)(models.length)

    return hasSingleModel ? Array.head(models) : Option.none()
  }

const returnModel =
  (scan: FunctionDefinition) =>
  (checker: ts.TypeChecker) =>
  (dataBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>) =>
  (expression: ts.Expression) => {
    const constructed = dataStructureEntryFromExpression(checker)(dataBySymbol)(expression)

    if (Option.isSome(constructed)) {
      return constructed
    }

    const signature = checker.getSignatureFromDeclaration(scan)

    return pipe(
      Option.fromNullishOr(signature),
      Option.map((resolved) => checker.getReturnTypeOfSignature(resolved)),
      Option.flatMap((type) => {
        const alias = Option.fromNullishOr(type.aliasSymbol)
        const symbol = type.getSymbol()
        const symbolOption = Option.fromNullishOr(symbol)

        return pipe(
          alias,
          Option.orElse(Function.constant(symbolOption)),
          Option.map(canonicalSymbol(checker)),
          Option.flatMap((candidate) => {
            const candidateKey = referenceKey(candidate)

            return HashMap.get(dataBySymbol, candidateKey)
          })
        )
      })
    )
  }

const modelShapesMatch = (source: DataStructureEntry) => (target: DataStructureEntry) =>
  pipe(
    Option.zipWith(source.shape, target.shape, (left, right) => strictEqual(right)(left)),
    Option.getOrElse(Function.constFalse)
  )

const passThroughConversion =
  (checker: ts.TypeChecker) =>
  (dataBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>) =>
  (entry: FunctionEntry) => {
    const conversionFromDefinition = (scan: FunctionDefinition) => {
      const conversionFromParameter = (
        parameterModelPair: readonly [ts.Identifier, DataStructureEntry]
      ) => {
        const parameter = Tuple.get(parameterModelPair, 0)
        const source = Tuple.get(parameterModelPair, 1)

        const conversionFromExpression = (expression: ts.Expression) => {
          const propertyCopies = propertyCopiesParameter(parameter)

          const everyPropertyCopies = (literal: ts.ObjectLiteralExpression) =>
            Array.every(literal.properties, propertyCopies)

          const distinctTarget = (target: DataStructureEntry) => target.symbol !== source.symbol
          const matchingShape = modelShapesMatch(source)

          const makePassThroughConversion = (target: DataStructureEntry) =>
            new PassThroughConversion({
              source,
              target,
              functionEntry: entry,
              node: expression
            })

          return pipe(
            constructionObject(expression),
            Option.filter((literal) => literal.properties.length > 0),
            Option.filter(everyPropertyCopies),
            Option.flatMap(() =>
              pipe(
                returnModel(scan)(checker)(dataBySymbol)(expression),
                Option.filter(distinctTarget),
                Option.filter(matchingShape),
                Option.map(makePassThroughConversion)
              )
            )
          )
        }

        return pipe(returnedExpression(scan), Option.flatMap(conversionFromExpression))
      }

      return pipe(
        parameterModel(scan)(checker)(dataBySymbol),
        Option.flatMap(conversionFromParameter)
      )
    }

    return pipe(entry.scan, Option.flatMap(conversionFromDefinition))
  }

const classHasInvariant = (entry: DataStructureEntry) => {
  const hasInvariantMember = (declaration: ts.ClassDeclaration) => {
    const nodes = astNodesIn(declaration)

    const identifierHasInvariantName = (identifier: ts.Identifier) =>
      HashSet.has(invariantMemberNames, identifier.text)

    const nodeIsInvariantIdentifier = (node: ts.Node) =>
      pipe(Option.liftPredicate(ts.isIdentifier)(node), Option.exists(identifierHasInvariantName))

    return Iterable.some(nodes, nodeIsInvariantIdentifier)
  }

  return pipe(
    Option.liftPredicate(ts.isClassDeclaration)(entry.declaration),
    Option.exists(hasInvariantMember)
  )
}

const declarationIsProtocol = (checker: ts.TypeChecker) => (entry: DataStructureEntry) => {
  const classDataFromDeclaration = classDataForDeclaration(checker)(emptyVisitedSymbols)

  const classProtocol = pipe(
    Option.liftPredicate(ts.isClassDeclaration)(entry.declaration),
    Option.flatMap(classDataFromDeclaration),
    Option.exists(Struct.get("protocol"))
  )

  const isTypeAlias = ts.isTypeAliasDeclaration(entry.declaration)
  const isUnion = isTypeAlias && ts.isUnionTypeNode(entry.declaration.type)
  const isEnum = ts.isEnumDeclaration(entry.declaration)
  const protocolChecks = Array.make(classProtocol, isUnion, isEnum)

  return Array.some(protocolChecks, Boolean)
}

const identifierInHeritage = (declaration: DataStructureDeclaration) => (node: ts.Identifier) => {
  const heritageClausesOf = (classDeclaration: ts.ClassDeclaration) =>
    Option.fromNullishOr(classDeclaration.heritageClauses)

  const clauseContainsNode = (clauses: ReadonlyArray<ts.HeritageClause>) =>
    Array.some(clauses, nodeInside(node))

  return pipe(
    Option.liftPredicate(ts.isClassDeclaration)(declaration),
    Option.flatMap(heritageClausesOf),
    Option.exists(clauseContainsNode)
  )
}

const declarationSelfReference = (checker: ts.TypeChecker) => (entry: DataStructureEntry) => {
  const nodes = astNodesIn(entry.declaration)
  const notEntryName = (identifier: ts.Identifier) => identifier !== entry.nameNode

  const notHeritageIdentifier = (identifier: ts.Identifier) =>
    !identifierInHeritage(entry.declaration)(identifier)

  const symbolEqualsEntry = strictEqual(entry.symbol)

  const nodeIsSelfReference = (node: ts.Node) =>
    pipe(
      Option.liftPredicate(ts.isIdentifier)(node),
      Option.filter(notEntryName),
      Option.filter(notHeritageIdentifier),
      Option.flatMap(symbolAt(checker)),
      Option.exists(symbolEqualsEntry)
    )

  return Iterable.some(nodes, nodeIsSelfReference)
}

const classExtendsSchema = (checker: ts.TypeChecker) => (entry: DataStructureEntry) => {
  const classDataFromDeclaration = classDataForDeclaration(checker)(emptyVisitedSymbols)

  return pipe(
    Option.liftPredicate(ts.isClassDeclaration)(entry.declaration),
    Option.flatMap(classDataFromDeclaration),
    Option.exists(Struct.get("runtimeSchema"))
  )
}

const declarationIsRuntimeSchema = (checker: ts.TypeChecker) => (entry: DataStructureEntry) => {
  const declarations = symbolDeclarations(entry.symbol) ?? Array.empty()

  const variableSchema = Array.some(declarations, (declaration) => {
    const isVariable = ts.isVariableDeclaration(declaration)

    return isVariable && runtimeSchemaType(checker)(declaration)
  })

  const extendsSchema = classExtendsSchema(checker)(entry)
  const runtimeSchemaChecks = Array.make(variableSchema, extendsSchema)

  return Array.some(runtimeSchemaChecks, Boolean)
}

const structuralRoles =
  (checker: ts.TypeChecker) =>
  (
    ownersByData: HashMap.HashMap<ReferenceKey<ts.Symbol>, HashSet.HashSet<ReferenceKey<ts.Symbol>>>
  ) =>
  (
    ownersByFunction: HashMap.HashMap<
      ReferenceKey<ts.Symbol>,
      HashSet.HashSet<ReferenceKey<ts.Symbol>>
    >
  ) =>
  (functionBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, FunctionEntry>) =>
  (
    dataStructures: ReadonlyArray<DataStructureEntry>
  ): HashMap.HashMap<ReferenceKey<ts.Symbol>, HashSet.HashSet<ModelRole>> =>
    pipe(
      dataStructures,
      Array.map((entry) => {
        const entryKey = referenceKey(entry.symbol)
        const owners = pipe(HashMap.get(ownersByData, entryKey), Option.getOrElse(HashSet.empty))
        const roles = HashSet.empty<ModelRole>()
        const directlyShared = HashSet.size(owners) >= 2

        const ownerHasMultipleCallers = (owner: ReferenceKey<ts.Symbol>) => {
          const hasMultipleCallers = (callers: HashSet.HashSet<ReferenceKey<ts.Symbol>>) =>
            HashSet.size(callers) >= 2

          return pipe(HashMap.get(ownersByFunction, owner), Option.exists(hasMultipleCallers))
        }

        const sharedThroughFunction = HashSet.some(owners, ownerHasMultipleCallers)
        const shared = directlyShared || sharedThroughFunction

        const ownerIsExported = (owner: ReferenceKey<ts.Symbol>) =>
          pipe(HashMap.get(functionBySymbol, owner), Option.exists(Struct.get("exported")))

        const usedByExportedFunction = HashSet.some(owners, ownerIsExported)
        const isRuntimeSchema = declarationIsRuntimeSchema(checker)(entry)
        const boundaryEvidence = Array.make(usedByExportedFunction, isRuntimeSchema)
        const boundary = entry.exported && Array.some(boundaryEvidence, Boolean)
        const invariant = classHasInvariant(entry)
        const protocol = declarationIsProtocol(checker)(entry)
        const recursive = declarationSelfReference(checker)(entry)
        const sharedObservation = Tuple.make("shared" as const, shared)
        const boundaryObservation = Tuple.make("boundary" as const, boundary)
        const invariantObservation = Tuple.make("invariant" as const, invariant)
        const protocolObservation = Tuple.make("protocol" as const, protocol)
        const recursiveObservation = Tuple.make("recursive" as const, recursive)

        const observations: ReadonlyArray<readonly [ModelRole, boolean]> = Array.make(
          sharedObservation,
          boundaryObservation,
          invariantObservation,
          protocolObservation,
          recursiveObservation
        )

        const established = Array.filter(observations, Tuple.get(1))

        const addObservationRole = (
          current: HashSet.HashSet<ModelRole>,
          observation: readonly [ModelRole, boolean]
        ) => {
          const role = Tuple.get(observation, 0)

          return HashSet.add(current, role)
        }

        const completed = Array.reduce(established, roles, addObservationRole)

        return Tuple.make(entryKey, completed)
      }),
      HashMap.fromIterable
    )

const shapeGroups = (
  dataStructures: ReadonlyArray<DataStructureEntry>
): HashMap.HashMap<string, ReadonlyArray<DataStructureEntry>> => {
  const emptyGroups = HashMap.empty<string, ReadonlyArray<DataStructureEntry>>()

  return Array.reduce(dataStructures, emptyGroups, (groups, entry) =>
    pipe(
      entry.shape,
      Option.map((shape) => {
        const group = pipe(HashMap.get(groups, shape), Option.getOrElse(Array.empty))
        const nextGroup = Array.append(group, entry)

        return setReplacingValue(shape)(groups)(nextGroup)
      }),
      Option.getOrElse(Function.constant(groups))
    )
  )
}

// ConceptIndex is shared because every concept Rule queries the same immutable program snapshot.
export class ConceptIndex extends Data.Class<{
  readonly dataStructures: ReadonlyArray<DataStructureEntry>
  readonly dataBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>
  readonly functionBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, FunctionEntry>
  readonly ownersByData: HashMap.HashMap<
    ReferenceKey<ts.Symbol>,
    HashSet.HashSet<ReferenceKey<ts.Symbol>>
  >
  readonly ownersByFunction: HashMap.HashMap<
    ReferenceKey<ts.Symbol>,
    HashSet.HashSet<ReferenceKey<ts.Symbol>>
  >
  readonly rolesByData: HashMap.HashMap<ReferenceKey<ts.Symbol>, HashSet.HashSet<ModelRole>>
  readonly fieldReads: ReadonlyArray<FieldRead>
  readonly readFieldNames: HashSet.HashSet<string>
  readonly shapeGroups: HashMap.HashMap<string, ReadonlyArray<DataStructureEntry>>
  readonly passThroughConversions: ReadonlyArray<PassThroughConversion>
  readonly parameterBags: ReadonlyArray<ParameterBag>
}> {}

const buildConceptIndex = (program: ts.Program) => {
  const checker = program.getTypeChecker()
  const dataStructures = dataStructureEntries(checker)(program)
  const dataBySymbol = Array.reduce(dataStructures, emptyDataBySymbol, addDataStructureEntry)
  const functions = functionEntries(checker)(program)(dataBySymbol)
  const functionBySymbol = Array.reduce(functions, emptyFunctionBySymbol, addFunctionEntry)

  const ownersByDataBuilder = pipe(
    HashMap.empty<ReferenceKey<ts.Symbol>, HashSet.HashSet<ReferenceKey<ts.Symbol>>>(),
    HashMap.beginMutation
  )

  const ownersByFunctionBuilder = pipe(
    HashMap.empty<ReferenceKey<ts.Symbol>, HashSet.HashSet<ReferenceKey<ts.Symbol>>>(),
    HashMap.beginMutation
  )

  const fields = fieldModelIndex(dataStructures)
  const fieldReads = MutableList.make<FieldRead>()
  const readFieldNameIndex = pipe(HashMap.empty<string, true>(), HashMap.beginMutation)
  const parameterBags = MutableList.make<ParameterBag>()
  const sourceFiles = pipe(program.getSourceFiles(), Array.filter(isProjectSourceFile))

  Array.forEach(sourceFiles, (sourceFile) => {
    const nodes = astNodesIn(sourceFile)

    Iterable.forEach(nodes, (node) => {
      pipe(
        Option.liftPredicate(ts.isIdentifier)(node),
        Option.flatMap((identifier) => {
          const recordIdentifierSymbol = (symbol: ts.Symbol): true => {
            const owner = ownerSymbol(checker)(functionBySymbol)(identifier)
            const symbolKey = referenceKey(symbol)
            const data = HashMap.get(dataBySymbol, symbolKey)
            const fn = HashMap.get(functionBySymbol, symbolKey)
            const references = fieldReferences(checker)(dataBySymbol)(fields)(identifier)(symbol)

            pipe(
              data,
              Option.bindTo("dataEntry"),
              Option.bind("ownerSymbol", Function.constant(owner)),
              Option.filter(({ dataEntry, ownerSymbol }) => {
                const isForeignName = !declarationNameIs(identifier)(dataEntry)
                const isForeignOwner = ownerSymbol !== symbol
                const trackChecks = Array.make(isForeignName, isForeignOwner)

                return Array.every(trackChecks, Boolean)
              }),
              Option.map(({ ownerSymbol }) => addOwner(ownersByDataBuilder)(symbol)(ownerSymbol))
            )

            pipe(
              fn,
              Option.bindTo("functionEntry"),
              Option.bind("ownerSymbol", Function.constant(owner)),
              Option.filter(({ functionEntry, ownerSymbol }) => {
                const isForeignName = !declarationNameIs(identifier)(functionEntry)
                const isForeignOwner = ownerSymbol !== symbol
                const trackChecks = Array.make(isForeignName, isForeignOwner)

                return Array.every(trackChecks, Boolean)
              }),
              Option.map(({ ownerSymbol }) =>
                addOwner(ownersByFunctionBuilder)(symbol)(ownerSymbol)
              )
            )

            const declarations = symbolDeclarations(symbol) ?? Array.empty()

            const declarationNamesIdentifier = flow(
              ts.getNameOfDeclaration,
              strictEqual(identifier)
            )

            const fieldIsDeclaration = pipe(declarations, Array.some(declarationNamesIdentifier))
            const isMechanicalForwarding = mechanicalForwardingRead(identifier)
            const notFieldDeclaration = !fieldIsDeclaration
            const notMechanicalForwarding = !isMechanicalForwarding
            const isIndependentRead = Array.make(notFieldDeclaration, notMechanicalForwarding)
            const everyCheckHolds = (checks: ReadonlyArray<boolean>) => Array.every(checks, Boolean)

            pipe(
              Option.liftPredicate(everyCheckHolds)(isIndependentRead),
              Option.map(() => {
                Array.forEach(references, (reference) => {
                  const field = Tuple.get(reference, 1)
                  const fieldKey = referenceKey(field)
                  const fieldRead = new FieldRead({ field: fieldKey })
                  MutableList.append(fieldReads, fieldRead)
                })
              })
            )

            return true
          }

          return pipe(symbolAt(checker)(identifier), Option.map(recordIdentifierSymbol))
        })
      )

      pipe(
        Option.liftPredicate(ts.isCallExpression)(node),
        Option.map((call) => {
          const callee = unwrapCallee(call.expression)
          const firstArgument = pipe(call.arguments, Array.head)

          const expressionIsStruct = (access: ts.PropertyAccessExpression) => {
            const identifierIsStruct = flow(
              Struct.get<ts.Identifier, "text">("text"),
              strictEqual("Struct")
            )

            return pipe(
              Option.liftPredicate(ts.isIdentifier)(access.expression),
              Option.exists(identifierIsStruct)
            )
          }

          const accessNameIsGet = (access: ts.PropertyAccessExpression) =>
            strictEqual("get")(access.name.text)

          const structField = pipe(
            Option.liftPredicate(ts.isPropertyAccessExpression)(callee),
            Option.filter(accessNameIsGet),
            Option.filter(expressionIsStruct),
            Option.flatMap(Function.constant(firstArgument)),
            Option.filter(ts.isStringLiteralLike),
            Option.map(Struct.get("text"))
          )

          pipe(
            structField,
            Option.map((fieldName) => {
              HashMap.set(readFieldNameIndex, fieldName, true)
            })
          )

          const called = pipe(
            symbolAt(checker)(callee),
            Option.flatMap((symbol) => {
              const symbolKey = referenceKey(symbol)

              return HashMap.get(functionBySymbol, symbolKey)
            })
          )

          pipe(
            called,
            Option.map((functionEntry) => {
              Array.forEach(call.arguments, (argument) => {
                const model = dataStructureEntryFromExpression(checker)(dataBySymbol)(argument)

                pipe(
                  model,
                  Option.map((modelEntry) => {
                    const parameterBag = new ParameterBag({
                      model: modelEntry,
                      functionEntry,
                      node: argument
                    })

                    MutableList.append(parameterBags, parameterBag)
                  })
                )
              })
            })
          )
        })
      )
    })
  })

  const ownersByData = HashMap.endMutation(ownersByDataBuilder)
  const ownersByFunction = HashMap.endMutation(ownersByFunctionBuilder)

  const rolesByData =
    structuralRoles(checker)(ownersByData)(ownersByFunction)(functionBySymbol)(dataStructures)

  const conversions: ReadonlyArray<PassThroughConversion> = Array.filterMap(functions, (entry) => {
    const conversion = passThroughConversion(checker)(dataBySymbol)(entry)

    return Result.fromOption(conversion, Function.constVoid)
  })

  const fieldReadList = MutableList.toArray(fieldReads)

  const readFieldNameSet = pipe(
    readFieldNameIndex,
    HashMap.endMutation,
    HashMap.keys,
    HashSet.fromIterable
  )

  const shapeGroupMap = shapeGroups(dataStructures)
  const parameterBagList = MutableList.toArray(parameterBags)

  return new ConceptIndex({
    dataStructures,
    dataBySymbol,
    functionBySymbol,
    ownersByData,
    ownersByFunction,
    rolesByData,
    fieldReads: fieldReadList,
    readFieldNames: readFieldNameSet,
    shapeGroups: shapeGroupMap,
    passThroughConversions: conversions,
    parameterBags: parameterBagList
  })
}

const conceptIndexOwner = makeLatestIdentityOwner(buildConceptIndex)

export const conceptIndexFor = flow(
  Struct.get<ProgramMatchContext, "program">("program"),
  (program) => conceptIndexOwner(program)(program)
)
