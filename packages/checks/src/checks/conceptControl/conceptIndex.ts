import {
  Array,
  Data,
  Function,
  HashMap,
  HashSet,
  Iterable,
  Match,
  MutableList,
  Option,
  Order,
  Struct,
  Tuple,
  pipe,
  Result
} from "effect"
import { strictEqual } from "@better-typescript/core/engine/equivalence"
import * as ts from "typescript"
import { astNodesIn, isProjectSourceFile } from "@better-typescript/core/engine/sources"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"
import {
  classDeclarationName,
  functionDeclarationName,
  functionInitializer,
  hasExportModifier,
  isExtendsClause,
  returnedExpression,
  symbolDeclarations,
  unwrapCallee,
  unwrapTransparentExpression,
  variableDeclarationInitializer
} from "../support/tsNode.js"
import { symbolDeclaredInEffectPackage } from "../support/tsSignature.js"
import { type ReferenceKey, referenceKey } from "../support/referenceKey.js"

const noneTypeShape: Option.Option<string> = Option.none()
import {
  ConceptIndex,
  DataStructureEntry,
  FieldRead,
  FunctionEntry,
  ParameterBag,
  PassThroughConversion,
  type DataStructureDeclaration,
  type ModelRole
} from "./data.js"
import type { FunctionDefinition } from "../support/tsNode.js"

const effectDataMembers = HashSet.make(
  "Class",
  "Error",
  "ErrorClass",
  "Opaque",
  "TaggedClass",
  "TaggedError",
  "TaggedErrorClass",
  "asClass"
)

const effectProtocolMembers = HashSet.make(
  "Error",
  "ErrorClass",
  "TaggedClass",
  "TaggedError",
  "TaggedErrorClass"
)

const effectErrorMembers = HashSet.make("Error", "ErrorClass", "TaggedError", "TaggedErrorClass")

const schemaOnlyDataMembers = HashSet.make("ErrorClass", "Opaque", "TaggedErrorClass", "asClass")

const inheritedErrorFieldNames = HashSet.make("cause", "message", "name", "stack")

const ignoredFieldNames = HashSet.make("pipe", "toJSON", "toString", "[TypeId]")

const EffectDataClass = Data.Class<{
  readonly protocol: boolean
  readonly runtimeSchema: boolean
  readonly errorLike: boolean
}>

const schemaDataClass = new EffectDataClass({
  protocol: false,
  runtimeSchema: true,
  errorLike: false
})

const symbolDeclaredInSchemaModule = (symbol: ts.Symbol) => {
  const declarations = symbolDeclarations(symbol) ?? Array.empty()

  return Array.some(declarations, (declaration) => {
    const fileName = declaration.getSourceFile().fileName.replaceAll("\\", "/")
    const isSourceModule = fileName.endsWith("/Schema.ts")
    const isDeclarationModule = fileName.endsWith("/Schema.d.ts")
    const moduleChecks = Array.make(isSourceModule, isDeclarationModule)

    return Array.some(moduleChecks, Boolean)
  })
}

const effectDataClassForSymbol = (symbol: ts.Symbol): Option.Option<typeof schemaDataClass> => {
  const member = symbol.getName()

  const isEffectMember =
    symbolDeclaredInEffectPackage(symbol) && HashSet.has(effectDataMembers, member)

  if (!isEffectMember) {
    return Option.none()
  }

  const runtimeSchema =
    HashSet.has(schemaOnlyDataMembers, member) || symbolDeclaredInSchemaModule(symbol)

  const protocol = HashSet.has(effectProtocolMembers, member)
  const errorLike = HashSet.has(effectErrorMembers, member)

  const data = new EffectDataClass({
    protocol,
    runtimeSchema,
    errorLike
  })

  return Option.some(data)
}

const invariantMemberNames = HashSet.make(
  "brand",
  "check",
  "checkEffect",
  "refine",
  "transform",
  "transformOrFail"
)

const structuralRoleSuffixes = HashSet.make(
  "Context",
  "Data",
  "Info",
  "Input",
  "Model",
  "Options",
  "Output",
  "Params",
  "Result",
  "State"
)

const emptyDataStructureEntries: ReadonlyArray<DataStructureEntry> = Array.empty()
const noneDeclarationName: Option.Option<ts.DeclarationName> = Option.none()
const noneIdentifier: Option.Option<ts.Identifier> = Option.none()
const noneDataStructureEntry: Option.Option<DataStructureEntry> = Option.none()
const noneObjectLiteral: Option.Option<ts.ObjectLiteralExpression> = Option.none()
const noneFunctionEntry: Option.Option<FunctionEntry> = Option.none()

const canonicalSymbol = (checker: ts.TypeChecker) => (symbol: ts.Symbol) =>
  strictEqual(symbol.flags & ts.SymbolFlags.Alias, 0) ? symbol : checker.getAliasedSymbol(symbol)

const symbolAt = (checker: ts.TypeChecker) => (node: ts.Node) =>
  pipe(
    checker.getSymbolAtLocation(node),
    Option.fromNullishOr,
    Option.map(canonicalSymbol(checker))
  )

const emptyHeritageClauses = Array.empty<ts.HeritageClause>()

const heritageClauseTypesHead = (clause: ts.HeritageClause) => Array.head(clause.types)

const classHeritageExpression = (declaration: ts.ClassDeclaration): Option.Option<ts.Expression> =>
  pipe(
    declaration.heritageClauses ?? emptyHeritageClauses,
    Array.findFirst(isExtendsClause),
    Option.flatMap(heritageClauseTypesHead),
    Option.map(Struct.get("expression"))
  )

const classDataForDeclaration = (
  checker: ts.TypeChecker,
  declaration: ts.ClassDeclaration,
  visited: ReadonlyArray<ts.Symbol> = Array.empty<ts.Symbol>()
): Option.Option<typeof schemaDataClass> => {
  const classDataFromExpression = (expression: ts.Expression) =>
    classDataForExpression(checker, expression, visited)

  return pipe(classHeritageExpression(declaration), Option.flatMap(classDataFromExpression))
}

const classDataForSymbol = (
  checker: ts.TypeChecker,
  symbol: ts.Symbol,
  visited: ReadonlyArray<ts.Symbol>
): Option.Option<typeof schemaDataClass> => {
  const resolved = canonicalSymbol(checker)(symbol)
  const direct = effectDataClassForSymbol(resolved)
  const candidateEqualsResolved = (candidate: ts.Symbol) => strictEqual(candidate, resolved)
  const alreadyVisited = Array.some(visited, candidateEqualsResolved)
  const directFound = Option.isSome(direct)
  const stopSearch = directFound || alreadyVisited

  if (stopSearch) {
    return direct
  }

  const nextVisited = Array.append(visited, resolved)
  const declarations = symbolDeclarations(resolved) ?? Array.empty<ts.Declaration>()

  return pipe(
    declarations,
    Array.filterMap((declaration) => {
      const classDataFromDeclaration = (classDeclaration: ts.ClassDeclaration) =>
        classDataForDeclaration(checker, classDeclaration, nextVisited)

      const classDataFromInitializer = (initializer: ts.Expression) =>
        classDataForExpression(checker, initializer, nextVisited)

      const classData = pipe(
        Option.liftPredicate(ts.isClassDeclaration)(declaration),
        Option.flatMap(classDataFromDeclaration)
      )

      const variableData = pipe(
        Option.liftPredicate(ts.isVariableDeclaration)(declaration),
        Option.flatMap(variableDeclarationInitializer),
        Option.flatMap(classDataFromInitializer)
      )

      return pipe(
        classData,
        Option.orElse(Function.constant(variableData)),
        Result.fromOption(Function.constVoid)
      )
    }),
    Array.head
  )
}

const classDataForExpression = (
  checker: ts.TypeChecker,
  expression: ts.Expression,
  visited: ReadonlyArray<ts.Symbol>
): Option.Option<typeof schemaDataClass> => {
  const unwrapped = unwrapTransparentExpression(expression)
  const callee = unwrapCallee(unwrapped)

  const accessNameIsExtend = (access: ts.PropertyAccessExpression) =>
    strictEqual(access.name.text, "extend")

  const extension = pipe(
    Option.liftPredicate(ts.isPropertyAccessExpression)(callee),
    Option.filter(accessNameIsExtend)
  )

  if (Option.isSome(extension)) {
    const access = extension.value
    const inherited = classDataForExpression(checker, access.expression, visited)

    const inheritedSchema = pipe(
      inherited,
      Option.map((data) => new EffectDataClass({ ...data, runtimeSchema: true }))
    )

    const effectExtension = pipe(
      symbolAt(checker)(access.name),
      Option.filter(symbolDeclaredInEffectPackage),
      Option.as(schemaDataClass)
    )

    return pipe(inheritedSchema, Option.orElse(Function.constant(effectExtension)))
  }

  const reference = ts.isPropertyAccessExpression(callee) ? callee.name : callee
  const classDataFromSymbol = (symbol: ts.Symbol) => classDataForSymbol(checker, symbol, visited)

  return pipe(
    Option.liftPredicate(ts.isIdentifier)(reference),
    Option.flatMap(symbolAt(checker)),
    Option.flatMap(classDataFromSymbol)
  )
}

const classIsDataStructure = (checker: ts.TypeChecker) => (declaration: ts.ClassDeclaration) =>
  pipe(classDataForDeclaration(checker, declaration), Option.isSome)

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
  const type = declaration.type
  const isFunction = ts.isFunctionTypeNode(type)
  const isConstructor = ts.isConstructorTypeNode(type)
  const exclusions = Array.make(isFunction, isConstructor)

  return Array.every(exclusions, (excluded) => !excluded)
}

const runtimeSchemaType = (checker: ts.TypeChecker, declaration: ts.VariableDeclaration) => {
  const type = checker.getTypeAtLocation(declaration.name)
  const text = checker.typeToString(type, declaration.name, ts.TypeFormatFlags.NoTruncation)
  const includesSchemaType = text.includes("Schema<")
  const startsWithSchemaNamespace = text.startsWith("Schema.")
  const schemaChecks = Array.make(includesSchemaType, startsWithSchemaNamespace)

  return Array.some(schemaChecks, Boolean)
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

const fieldsFor = (
  checker: ts.TypeChecker,
  declaration: DataStructureDeclaration,
  nameNode: ts.Identifier
): ReadonlyArray<ts.Symbol> => {
  const type = checker.getTypeAtLocation(nameNode)

  const classDataFromDeclaration = (classDeclaration: ts.ClassDeclaration) =>
    classDataForDeclaration(checker, classDeclaration)

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
      const externalField = strictEqual(declaredInProject, false)
      const inheritedErrorField = knownErrorField && externalField
      const keepErrorLike = strictEqual(errorLike, false)
      const keepInheritedErrorField = strictEqual(inheritedErrorField, false)
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

const shapeFor = (
  checker: ts.TypeChecker,
  fields: ReadonlyArray<ts.Symbol>
): Option.Option<string> => {
  if (strictEqual(fields.length, 0)) {
    return Option.none()
  }

  const describe = fieldTypeText(checker)
  const fieldShapePart = (field: ts.Symbol) => `${field.getName()}:${describe(field)}`
  const parts = pipe(fields, Array.map(fieldShapePart), Array.sort(Order.String))

  return pipe(parts, Array.join("|"), Option.some)
}

const unwrapParenthesizedType = (type: ts.TypeNode): ts.TypeNode =>
  ts.isParenthesizedTypeNode(type) ? unwrapParenthesizedType(type.type) : type

const compactTypeText = (type: ts.TypeNode) => type.getText().replace(/\s+/g, " ").trim()

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
    Match.value,
    Match.when(ts.isUnionTypeNode, unionStructureShape),
    Match.when(ts.isIntersectionTypeNode, intersectionStructureShape),
    Match.when(ts.isTupleTypeNode, tupleStructureShape),
    Match.orElse(Function.constant(noneTypeShape))
  )

const shapeForDeclaration = (
  checker: ts.TypeChecker,
  declaration: DataStructureDeclaration,
  fieldSymbols: ReadonlyArray<ts.Symbol>
) => {
  const fieldShape = declarationHasComparableShape(declaration)
    ? shapeFor(checker, fieldSymbols)
    : Option.none<string>()

  const aliasShape = pipe(
    Option.liftPredicate(ts.isTypeAliasDeclaration)(declaration),
    Option.flatMap(structureShapeForAlias)
  )

  return pipe(fieldShape, Option.orElse(Function.constant(aliasShape)))
}

const entryForDeclaration = (
  checker: ts.TypeChecker,
  declaration: DataStructureDeclaration,
  documentationNode: ts.Node,
  nameNode: ts.Identifier,
  exported: boolean
) =>
  pipe(
    symbolAt(checker)(nameNode),
    Option.map((symbol) => {
      const fieldSymbols = fieldsFor(checker, declaration, nameNode)
      const shape = shapeForDeclaration(checker, declaration, fieldSymbols)
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

const declarationEntriesForStatement = (
  checker: ts.TypeChecker,
  statement: ts.Statement
): ReadonlyArray<DataStructureEntry> => {
  const exported = hasExportModifier(statement)

  const entriesFor = (declaration: DataStructureDeclaration, nameNode: ts.Identifier) =>
    pipe(entryForDeclaration(checker, declaration, statement, nameNode, exported), Option.toArray)

  const namedDataClassEntries = (declaration: ts.ClassDeclaration) => {
    const entriesForNamedClass = (nameNode: ts.Identifier) => entriesFor(declaration, nameNode)

    return pipe(
      classDeclarationName(declaration),
      Option.map(entriesForNamedClass),
      Option.getOrElse(Function.constant(emptyDataStructureEntries))
    )
  }

  const namedInterfaceEntries = (declaration: ts.InterfaceDeclaration) =>
    entriesFor(declaration, declaration.name)

  const namedAliasEntries = (declaration: ts.TypeAliasDeclaration) =>
    entriesFor(declaration, declaration.name)

  const namedEnumEntries = (declaration: ts.EnumDeclaration) =>
    entriesFor(declaration, declaration.name)

  const namedDeclarationEntries = pipe(
    Match.value(statement),
    Match.when(isNamedDataClass(checker), namedDataClassEntries),
    Match.when(isDataInterface, namedInterfaceEntries),
    Match.when(isDataTypeAlias, namedAliasEntries),
    Match.when(ts.isEnumDeclaration, namedEnumEntries),
    Match.orElse(Function.constant(emptyDataStructureEntries))
  )

  if (namedDeclarationEntries.length > 0) {
    return namedDeclarationEntries
  }

  const isExportedVariable = ts.isVariableStatement(statement) && exported

  if (!isExportedVariable) {
    return Array.empty()
  }

  const runtimeSchemaEntry = (declaration: ts.VariableDeclaration) => {
    const entryForName = (nameNode: ts.Identifier) =>
      entryForDeclaration(checker, declaration, statement, nameNode, exported)

    return pipe(
      Option.liftPredicate(ts.isIdentifier)(declaration.name),
      Option.filter(() => runtimeSchemaType(checker, declaration)),
      Option.flatMap(entryForName),
      Result.fromOption(Function.constVoid)
    )
  }

  return Array.filterMap(statement.declarationList.declarations, runtimeSchemaEntry)
}

const entriesFromSourceFile =
  (checker: ts.TypeChecker) =>
  (sourceFile: ts.SourceFile): ReadonlyArray<DataStructureEntry> => {
    const entriesForStatement = (statement: ts.Statement) =>
      declarationEntriesForStatement(checker, statement)

    return Array.flatMap(sourceFile.statements, entriesForStatement)
  }

const dataStructureEntries = (context: ProgramContext): ReadonlyArray<DataStructureEntry> => {
  const programSourceFiles = context.program.getSourceFiles()
  const sourceFiles = pipe(programSourceFiles, Array.filter(isProjectSourceFile))
  const declarations = Array.flatMap(sourceFiles, entriesFromSourceFile(context.checker))

  return Array.dedupeWith(declarations, (first, second) => strictEqual(first.symbol, second.symbol))
}

const functionEntryForDeclaration = (
  checker: ts.TypeChecker,
  declaration: ts.FunctionDeclaration
) => {
  const entryForName = (nameNode: ts.Identifier) =>
    pipe(
      symbolAt(checker)(nameNode),
      Option.map((symbol) => {
        const definition = Option.some(declaration)
        const name = nameNode.text
        const sourceFile = declaration.getSourceFile()
        const exported = hasExportModifier(declaration)

        return new FunctionEntry({
          symbol,
          definition,
          nameNode,
          name,
          sourceFile,
          exported
        })
      })
    )

  return pipe(functionDeclarationName(declaration), Option.flatMap(entryForName))
}

const functionEntryForVariable = (
  checker: ts.TypeChecker,
  declaration: ts.VariableDeclaration,
  exported: boolean,
  dataBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>
) => {
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
        const definition = functionInitializer(declaration)
        const name = nameNode.text
        const sourceFile = declaration.getSourceFile()

        return new FunctionEntry({
          symbol,
          definition,
          nameNode,
          name,
          sourceFile,
          exported
        })
      })
    )

  return pipe(Option.liftPredicate(ts.isIdentifier)(declaration.name), Option.flatMap(entryForName))
}

const functionEntryForMethod = (checker: ts.TypeChecker, declaration: ts.MethodDeclaration) => {
  const entryForName = (nameNode: ts.Identifier) =>
    pipe(
      symbolAt(checker)(nameNode),
      Option.map((symbol) => {
        const definition = Option.some(declaration)
        const name = nameNode.text
        const sourceFile = declaration.getSourceFile()

        return new FunctionEntry({
          symbol,
          definition,
          nameNode,
          name,
          sourceFile,
          exported: false
        })
      })
    )

  return pipe(Option.liftPredicate(ts.isIdentifier)(declaration.name), Option.flatMap(entryForName))
}

const functionEntries = (
  context: ProgramContext,
  dataBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>
): ReadonlyArray<FunctionEntry> => {
  const sourceFiles = pipe(context.program.getSourceFiles(), Array.filter(isProjectSourceFile))

  const entriesFromSourceFile = (sourceFile: ts.SourceFile) => {
    const functionEntryFromNode = (node: ts.Node) => {
      const variableEntry = (declaration: ts.VariableDeclaration) => {
        const statement = declaration.parent.parent
        const isVariableStatement = ts.isVariableStatement(statement)
        const exported = isVariableStatement && hasExportModifier(statement)

        return functionEntryForVariable(context.checker, declaration, exported, dataBySymbol)
      }

      const entryForFunctionDeclaration = (declaration: ts.FunctionDeclaration) =>
        functionEntryForDeclaration(context.checker, declaration)

      const entryForMethodDeclaration = (declaration: ts.MethodDeclaration) =>
        functionEntryForMethod(context.checker, declaration)

      return pipe(
        Match.value(node),
        Match.when(ts.isFunctionDeclaration, entryForFunctionDeclaration),
        Match.when(ts.isMethodDeclaration, entryForMethodDeclaration),
        Match.when(ts.isVariableDeclaration, variableEntry),
        Match.orElse(Function.constant(noneFunctionEntry)),
        Result.fromOption(Function.constVoid)
      )
    }

    return pipe(astNodesIn(sourceFile), Array.fromIterable, Array.filterMap(functionEntryFromNode))
  }

  return Array.flatMap(sourceFiles, entriesFromSourceFile)
}

const addOwner = (
  index: HashMap.HashMap<ReferenceKey<ts.Symbol>, HashSet.HashSet<ReferenceKey<ts.Symbol>>>,
  target: ts.Symbol,
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

const nodeInside = (node: ts.Node) => (candidate: ts.Node) =>
  node.pos >= candidate.pos && node.end <= candidate.end

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

const statementOwnerName = (
  node: ts.Node,
  statement: ts.Statement
): Option.Option<ts.DeclarationName> =>
  pipe(
    Match.value(statement),
    Match.when(ts.isVariableStatement, variableStatementOwnerName(node)),
    Match.when(isNamedTopLevelDeclaration, namedTopLevelDeclarationName),
    Match.orElse(Function.constant(noneDeclarationName))
  )

const namedDeclarationIdentifier = (declaration: ts.FunctionDeclaration | ts.MethodDeclaration) =>
  pipe(Option.fromNullishOr(declaration.name), Option.filter(ts.isIdentifier))

const namedFunctionOrMethodName = (node: ts.Node) =>
  pipe(
    Match.value(node),
    Match.when(ts.isFunctionDeclaration, namedDeclarationIdentifier),
    Match.when(ts.isMethodDeclaration, namedDeclarationIdentifier),
    Match.orElse(Function.constant(noneIdentifier))
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
    Match.value(node),
    Match.when(ts.isArrowFunction, expressionFunctionOwnerName),
    Match.when(ts.isFunctionExpression, expressionFunctionOwnerName),
    Match.orElse(Function.constant(noneIdentifier))
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
  const ownerNameFromStatement = (statement: ts.Statement) => statementOwnerName(node, statement)

  return pipe(
    topLevelStatement(node),
    Option.flatMap(ownerNameFromStatement),
    Option.flatMap(symbolAt(checker))
  )
}

const ownerSymbol = (
  checker: ts.TypeChecker,
  functionBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, FunctionEntry>,
  node: ts.Node
) => {
  const topLevelOwner = topLevelOwnerSymbol(checker)(node)

  return pipe(
    Option.fromNullishOr(node.parent),
    Option.flatMap(functionOwnerFrom(checker)(functionBySymbol)),
    Option.orElse(Function.constant(topLevelOwner))
  )
}

const declarationNameIs = (node: ts.Identifier, entry: DataStructureEntry | FunctionEntry) =>
  strictEqual(node, entry.nameNode)

const fieldEntries = (
  entry: DataStructureEntry
): ReadonlyArray<readonly [ReferenceKey<ts.Symbol>, DataStructureEntry]> =>
  Array.map(entry.fieldSymbols, (field) => {
    const fieldKey = referenceKey(field)

    return Tuple.make(fieldKey, entry)
  })

const setReplacingValue = <Key, Value>(
  index: HashMap.HashMap<Key, Value>,
  key: Key,
  value: Value
): HashMap.HashMap<Key, Value> => pipe(index, HashMap.remove(key), HashMap.set(key, value))

const addFieldModel = (
  index: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>,
  entry: readonly [ReferenceKey<ts.Symbol>, DataStructureEntry]
): HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry> => {
  const key = Tuple.get(entry, 0)
  const value = Tuple.get(entry, 1)

  return setReplacingValue(index, key, value)
}

const emptyDataBySymbol = HashMap.empty<ReferenceKey<ts.Symbol>, DataStructureEntry>()

const addDataStructureEntry = (
  index: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>,
  entry: DataStructureEntry
): HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry> => {
  const key = referenceKey(entry.symbol)

  return setReplacingValue(index, key, entry)
}

const emptyFunctionBySymbol = HashMap.empty<ReferenceKey<ts.Symbol>, FunctionEntry>()

const addFunctionEntry = (
  index: HashMap.HashMap<ReferenceKey<ts.Symbol>, FunctionEntry>,
  entry: FunctionEntry
): HashMap.HashMap<ReferenceKey<ts.Symbol>, FunctionEntry> => {
  const key = referenceKey(entry.symbol)

  return setReplacingValue(index, key, entry)
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

  const assignmentInitializesAccess = (assignment: ts.PropertyAssignment) =>
    strictEqual(assignment.initializer, access)

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

      return strictEqual(assignmentName, access.name.text)
    })
  )

const modelFromResolvedType =
  (checker: ts.TypeChecker) =>
  (dataBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>) =>
  (type: ts.Type): Option.Option<DataStructureEntry> => {
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
  }

const modelFromType = (
  checker: ts.TypeChecker,
  dataBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>,
  node: ts.Node
) => pipe(checker.getTypeAtLocation(node), modelFromResolvedType(checker)(dataBySymbol))

const modelsFromResolvedType = (
  checker: ts.TypeChecker,
  dataBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>,
  type: ts.Type
): ReadonlyArray<DataStructureEntry> => {
  const direct = pipe(type, modelFromResolvedType(checker)(dataBySymbol), Option.toArray)

  if (direct.length > 0) {
    return direct
  }

  if (!type.isUnionOrIntersection()) {
    return Array.empty()
  }

  const modelsFromMember = (member: ts.Type) =>
    modelsFromResolvedType(checker, dataBySymbol, member)

  return Array.flatMap(type.types, modelsFromMember)
}

const fieldReferences = (
  checker: ts.TypeChecker,
  dataBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>,
  fields: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>,
  node: ts.Identifier,
  symbol: ts.Symbol
): ReadonlyArray<readonly [DataStructureEntry, ts.Symbol]> => {
  const symbolKey = referenceKey(symbol)
  const direct = HashMap.get(fields, symbolKey)

  if (Option.isSome(direct)) {
    const reference = Tuple.make(direct.value, symbol)

    return Array.make(reference)
  }

  const accessNameIsNode = (access: ts.PropertyAccessExpression) => strictEqual(access.name, node)

  const propertyAccess = pipe(
    Option.liftPredicate(ts.isPropertyAccessExpression)(node.parent),
    Option.filter(accessNameIsNode)
  )

  if (Option.isNone(propertyAccess)) {
    return Array.empty()
  }

  const receiverType = checker.getTypeAtLocation(propertyAccess.value.expression)
  const models = modelsFromResolvedType(checker, dataBySymbol, receiverType)

  const fieldReferenceForModel = (model: DataStructureEntry) => {
    const pairWithModel = (field: ts.Symbol) => Tuple.make(model, field)

    const fieldNamedLikeNode = (field: ts.Symbol) => {
      const fieldName = field.getName()

      return strictEqual(fieldName, node.text)
    }

    return pipe(
      model.fieldSymbols,
      Array.findFirst(fieldNamedLikeNode),
      Option.map(pairWithModel),
      Result.fromOption(Function.constVoid)
    )
  }

  return Array.filterMap(models, fieldReferenceForModel)
}

const modelFromObjectLiteral =
  (checker: ts.TypeChecker) =>
  (dataBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>) =>
  (literal: ts.ObjectLiteralExpression): Option.Option<DataStructureEntry> =>
    pipe(
      checker.getContextualType(literal),
      Option.fromNullishOr,
      Option.flatMap(modelFromResolvedType(checker)(dataBySymbol))
    )

const modelFromExpression =
  (checker: ts.TypeChecker) =>
  (dataBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>) =>
  (expression: ts.Expression): Option.Option<DataStructureEntry> =>
    pipe(
      unwrapCallee(expression),
      symbolAt(checker),
      Option.flatMap((symbol) => {
        const symbolKey = referenceKey(symbol)

        return HashMap.get(dataBySymbol, symbolKey)
      })
    )

const modelFromMakeCall =
  (checker: ts.TypeChecker) =>
  (dataBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>) =>
  (expression: ts.CallExpression): Option.Option<DataStructureEntry> => {
    const makeTargetExpression = (access: ts.PropertyAccessExpression) =>
      unwrapCallee(access.expression)

    const accessNameIsMake = (access: ts.PropertyAccessExpression) =>
      strictEqual(access.name.text, "make")

    return pipe(
      unwrapCallee(expression.expression),
      Option.liftPredicate(ts.isPropertyAccessExpression),
      Option.filter(accessNameIsMake),
      Option.map(makeTargetExpression),
      Option.flatMap(symbolAt(checker)),
      Option.flatMap((symbol) => {
        const symbolKey = referenceKey(symbol)

        return HashMap.get(dataBySymbol, symbolKey)
      })
    )
  }

const dataStructureEntryFromExpression = (
  checker: ts.TypeChecker,
  dataBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>,
  expression: ts.Expression
) => {
  const modelFromConstructedExpression = (constructed: ts.NewExpression) =>
    modelFromExpression(checker)(dataBySymbol)(constructed.expression)

  return pipe(
    unwrapTransparentExpression(expression),
    Match.value,
    Match.when(ts.isObjectLiteralExpression, modelFromObjectLiteral(checker)(dataBySymbol)),
    Match.when(ts.isNewExpression, modelFromConstructedExpression),
    Match.when(ts.isCallExpression, modelFromMakeCall(checker)(dataBySymbol)),
    Match.orElse(Function.constant(noneDataStructureEntry))
  )
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
    Match.value,
    Match.when(ts.isObjectLiteralExpression, Option.some<ts.ObjectLiteralExpression>),
    Match.when(ts.isNewExpression, objectLiteralArgument),
    Match.when(ts.isCallExpression, objectLiteralArgument),
    Match.orElse(Function.constant(noneObjectLiteral))
  )

const spreadCopiesParameter = (parameter: ts.Identifier, property: ts.SpreadAssignment) => {
  const identifierMatchesParameter = (identifier: ts.Identifier) =>
    strictEqual(identifier.text, parameter.text)

  return pipe(
    unwrapTransparentExpression(property.expression),
    Option.liftPredicate(ts.isIdentifier),
    Option.exists(identifierMatchesParameter)
  )
}

const assignmentCopiesParameter = (parameter: ts.Identifier, property: ts.PropertyAssignment) => {
  const identifierMatchesParameter = (identifier: ts.Identifier) =>
    strictEqual(identifier.text, parameter.text)

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
      const sameField = strictEqual(propertyName, initializer.name.text)
      const copyChecks = Array.make(isParameter, sameField)

      return Array.every(copyChecks, Boolean)
    })
  )
}

const propertyCopiesParameter = (
  parameter: ts.Identifier,
  property: ts.ObjectLiteralElementLike
) => {
  const spreadCopies = (spread: ts.SpreadAssignment) => spreadCopiesParameter(parameter, spread)

  const assignmentCopies = (assignment: ts.PropertyAssignment) =>
    assignmentCopiesParameter(parameter, assignment)

  return pipe(
    Match.value(property),
    Match.when(ts.isSpreadAssignment, spreadCopies),
    Match.when(ts.isPropertyAssignment, assignmentCopies),
    Match.orElse(Function.constFalse)
  )
}

const parameterModel = (
  definition: FunctionDefinition,
  checker: ts.TypeChecker,
  dataBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>
): Option.Option<readonly [ts.Identifier, DataStructureEntry]> => {
  const modelForParameter = (parameter: ts.ParameterDeclaration) => {
    const pairWithName = (parameterName: ts.Identifier) => {
      const pairWithParameterName = (parameterModelEntry: DataStructureEntry) =>
        Tuple.make(parameterName, parameterModelEntry)

      return pipe(
        modelFromType(checker, dataBySymbol, parameter),
        Option.map(pairWithParameterName)
      )
    }

    return pipe(
      Option.liftPredicate(ts.isIdentifier)(parameter.name),
      Option.flatMap(pairWithName),
      Result.fromOption(Function.constVoid)
    )
  }

  const models = Array.filterMap(definition.parameters, modelForParameter)
  const hasSingleModel = strictEqual(models.length, 1)

  return hasSingleModel ? Array.head(models) : Option.none()
}

const returnModel = (
  definition: FunctionDefinition,
  checker: ts.TypeChecker,
  dataBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>,
  expression: ts.Expression
) => {
  const constructed = dataStructureEntryFromExpression(checker, dataBySymbol, expression)

  if (Option.isSome(constructed)) {
    return constructed
  }

  const signature = checker.getSignatureFromDeclaration(definition)

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

const modelShapesMatch = (source: DataStructureEntry, target: DataStructureEntry) =>
  pipe(
    Option.zipWith(source.shape, target.shape, (left, right) => strictEqual(left, right)),
    Option.getOrElse(Function.constFalse)
  )

const passThroughConversion = (
  checker: ts.TypeChecker,
  dataBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>,
  entry: FunctionEntry
) => {
  const conversionFromDefinition = (definition: FunctionDefinition) => {
    const conversionFromParameter = (
      parameterModelPair: readonly [ts.Identifier, DataStructureEntry]
    ) => {
      const parameter = Tuple.get(parameterModelPair, 0)
      const source = Tuple.get(parameterModelPair, 1)

      const conversionFromExpression = (expression: ts.Expression) => {
        const propertyCopies = (property: ts.ObjectLiteralElementLike) =>
          propertyCopiesParameter(parameter, property)

        const everyPropertyCopies = (literal: ts.ObjectLiteralExpression) =>
          Array.every(literal.properties, propertyCopies)

        const distinctTarget = (target: DataStructureEntry) => target.symbol !== source.symbol
        const matchingShape = (target: DataStructureEntry) => modelShapesMatch(source, target)

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
              returnModel(definition, checker, dataBySymbol, expression),
              Option.filter(distinctTarget),
              Option.filter(matchingShape),
              Option.map(makePassThroughConversion)
            )
          )
        )
      }

      return pipe(returnedExpression(definition), Option.flatMap(conversionFromExpression))
    }

    return pipe(
      parameterModel(definition, checker, dataBySymbol),
      Option.flatMap(conversionFromParameter)
    )
  }

  return pipe(entry.definition, Option.flatMap(conversionFromDefinition))
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

const declarationIsProtocol = (checker: ts.TypeChecker, entry: DataStructureEntry) => {
  const classDataFromDeclaration = (declaration: ts.ClassDeclaration) =>
    classDataForDeclaration(checker, declaration)

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

const identifierInHeritage = (declaration: DataStructureDeclaration, node: ts.Identifier) => {
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

const declarationSelfReference = (checker: ts.TypeChecker, entry: DataStructureEntry) => {
  const nodes = astNodesIn(entry.declaration)
  const notEntryName = (identifier: ts.Identifier) => identifier !== entry.nameNode

  const notHeritageIdentifier = (identifier: ts.Identifier) =>
    !identifierInHeritage(entry.declaration, identifier)

  const symbolEqualsEntry = (symbol: ts.Symbol) => strictEqual(symbol, entry.symbol)

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

const classExtendsSchema = (checker: ts.TypeChecker, entry: DataStructureEntry) => {
  const classDataFromDeclaration = (declaration: ts.ClassDeclaration) =>
    classDataForDeclaration(checker, declaration)

  return pipe(
    Option.liftPredicate(ts.isClassDeclaration)(entry.declaration),
    Option.flatMap(classDataFromDeclaration),
    Option.exists(Struct.get("runtimeSchema"))
  )
}

const declarationIsRuntimeSchema = (checker: ts.TypeChecker, entry: DataStructureEntry) => {
  const declarations = symbolDeclarations(entry.symbol) ?? Array.empty()

  const variableSchema = Array.some(declarations, (declaration) => {
    const isVariable = ts.isVariableDeclaration(declaration)

    return isVariable && runtimeSchemaType(checker, declaration)
  })

  const extendsSchema = classExtendsSchema(checker, entry)
  const runtimeSchemaChecks = Array.make(variableSchema, extendsSchema)

  return Array.some(runtimeSchemaChecks, Boolean)
}

const structuralRoles = (
  checker: ts.TypeChecker,
  dataStructures: ReadonlyArray<DataStructureEntry>,
  ownersByData: HashMap.HashMap<ReferenceKey<ts.Symbol>, HashSet.HashSet<ReferenceKey<ts.Symbol>>>,
  ownersByFunction: HashMap.HashMap<
    ReferenceKey<ts.Symbol>,
    HashSet.HashSet<ReferenceKey<ts.Symbol>>
  >,
  functionBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, FunctionEntry>
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
      const isRuntimeSchema = declarationIsRuntimeSchema(checker, entry)
      const boundaryEvidence = Array.make(usedByExportedFunction, isRuntimeSchema)
      const boundary = entry.exported && Array.some(boundaryEvidence, Boolean)
      const invariant = classHasInvariant(entry)
      const protocol = declarationIsProtocol(checker, entry)
      const recursive = declarationSelfReference(checker, entry)
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

        return setReplacingValue(groups, shape, nextGroup)
      }),
      Option.getOrElse(Function.constant(groups))
    )
  )
}

const structuralRoleStem = (name: string) => {
  const stemWithoutSuffix = (suffix: string) => name.slice(0, -suffix.length)

  return pipe(
    structuralRoleSuffixes,
    Iterable.findFirst((suffix) => name.endsWith(suffix)),
    Option.map(stemWithoutSuffix),
    Option.filter((stem) => stem.length > 0)
  )
}

export const functionDerivedStem = structuralRoleStem

export const buildConceptIndex = (context: ProgramContext) => {
  const checker = context.checker
  const dataStructures = dataStructureEntries(context)
  const dataBySymbol = Array.reduce(dataStructures, emptyDataBySymbol, addDataStructureEntry)
  const functions = functionEntries(context, dataBySymbol)
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
  const sourceFiles = pipe(context.program.getSourceFiles(), Array.filter(isProjectSourceFile))

  Array.forEach(sourceFiles, (sourceFile) => {
    const nodes = astNodesIn(sourceFile)

    Iterable.forEach(nodes, (node) => {
      pipe(
        Option.liftPredicate(ts.isIdentifier)(node),
        Option.flatMap((identifier) => {
          const recordIdentifierSymbol = (symbol: ts.Symbol): true => {
            const owner = ownerSymbol(checker, functionBySymbol, identifier)
            const symbolKey = referenceKey(symbol)
            const data = HashMap.get(dataBySymbol, symbolKey)
            const fn = HashMap.get(functionBySymbol, symbolKey)
            const references = fieldReferences(checker, dataBySymbol, fields, identifier, symbol)

            pipe(
              data,
              Option.bindTo("dataEntry"),
              Option.bind("ownerSymbol", Function.constant(owner)),
              Option.filter(({ dataEntry, ownerSymbol }) => {
                const isForeignName = !declarationNameIs(identifier, dataEntry)
                const isForeignOwner = ownerSymbol !== symbol
                const trackChecks = Array.make(isForeignName, isForeignOwner)

                return Array.every(trackChecks, Boolean)
              }),
              Option.map(({ ownerSymbol }) => addOwner(ownersByDataBuilder, symbol, ownerSymbol))
            )

            pipe(
              fn,
              Option.bindTo("functionEntry"),
              Option.bind("ownerSymbol", Function.constant(owner)),
              Option.filter(({ functionEntry, ownerSymbol }) => {
                const isForeignName = !declarationNameIs(identifier, functionEntry)
                const isForeignOwner = ownerSymbol !== symbol
                const trackChecks = Array.make(isForeignName, isForeignOwner)

                return Array.every(trackChecks, Boolean)
              }),
              Option.map(({ ownerSymbol }) =>
                addOwner(ownersByFunctionBuilder, symbol, ownerSymbol)
              )
            )

            const declarations = symbolDeclarations(symbol) ?? Array.empty()

            const declarationNamesIdentifier = (declaration: ts.Declaration) => {
              const declarationName = ts.getNameOfDeclaration(declaration)

              return strictEqual(declarationName, identifier)
            }

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
                  const model = Tuple.get(reference, 0)
                  const field = Tuple.get(reference, 1)
                  const fieldKey = referenceKey(field)

                  const fieldRead = new FieldRead({
                    model,
                    field: fieldKey,
                    owner,
                    node: identifier
                  })

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
            const identifierIsStruct = (identifier: ts.Identifier) =>
              strictEqual(identifier.text, "Struct")

            return pipe(
              Option.liftPredicate(ts.isIdentifier)(access.expression),
              Option.exists(identifierIsStruct)
            )
          }

          const accessNameIsGet = (access: ts.PropertyAccessExpression) =>
            strictEqual(access.name.text, "get")

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
                const model = dataStructureEntryFromExpression(checker, dataBySymbol, argument)

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

  const rolesByData = structuralRoles(
    checker,
    dataStructures,
    ownersByData,
    ownersByFunction,
    functionBySymbol
  )

  const conversions: ReadonlyArray<PassThroughConversion> = Array.filterMap(functions, (entry) => {
    const conversion = passThroughConversion(checker, dataBySymbol, entry)

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
    projectRoot: context.projectRoot,
    dataStructures,
    functions,
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
