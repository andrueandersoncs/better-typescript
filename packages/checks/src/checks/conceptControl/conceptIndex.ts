import {
  Array,
  Function,
  HashMap,
  HashSet,
  Iterable,
  MutableHashMap,
  MutableHashSet,
  MutableList,
  Option,
  Order,
  Struct,
  Tuple,
  pipe
} from "effect"
import * as ts from "typescript"
import {
  astNodesIn,
  isProjectSourceFile
} from "@better-typescript/core/engine/sources"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"
import {
  functionInitializer,
  hasExportModifier,
  unwrapCallee,
  unwrapTransparentExpression
} from "../support/tsNode.js"
import {
  ConceptIndex,
  DataStructureEntry,
  FieldRead,
  FunctionEntry,
  ParameterBag,
  PassThroughConversion,
  type DataStructureDeclaration,
  type FunctionDefinition,
  type ModelRole
} from "./data.js"

const effectDataMembers = HashSet.make(
  "Class",
  "TaggedClass",
  "TaggedError",
  "TaggedRequest"
)

const ignoredFieldNames = HashSet.make(
  "pipe",
  "toJSON",
  "toString",
  "toJSON",
  "[TypeId]"
)

const invariantMemberNames = HashSet.make(
  "brand",
  "filter",
  "filterEffect",
  "refine",
  "transform",
  "transformLiteral",
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

const canonicalSymbol =
  (checker: ts.TypeChecker) =>
  (symbol: ts.Symbol): ts.Symbol =>
    (symbol.flags & ts.SymbolFlags.Alias) === 0
      ? symbol
      : checker.getAliasedSymbol(symbol)

const symbolAt =
  (checker: ts.TypeChecker) =>
  (node: ts.Node): Option.Option<ts.Symbol> =>
    pipe(
      checker.getSymbolAtLocation(node),
      Option.fromNullable,
      Option.map(canonicalSymbol(checker))
    )

const propertyAccessMember = (
  expression: ts.Expression
): Option.Option<string> =>
  pipe(
    unwrapCallee(expression),
    Option.liftPredicate(ts.isPropertyAccessExpression),
    Option.map((access) => access.name.text)
  )

const classDataMember = (
  declaration: ts.ClassDeclaration
): Option.Option<string> => {
  const clauses = declaration.heritageClauses ?? Array.empty()
  const extendsClause = Array.findFirst(
    clauses,
    (clause) => clause.token === ts.SyntaxKind.ExtendsKeyword
  )

  return pipe(
    extendsClause,
    Option.flatMap((clause) => Array.head(clause.types)),
    Option.flatMap((type) => propertyAccessMember(type.expression)),
    Option.filter((member) => HashSet.has(effectDataMembers, member))
  )
}

const classIsDataStructure = (declaration: ts.ClassDeclaration): boolean =>
  pipe(declaration, classDataMember, Option.isSome)

const interfaceCarriesData = (declaration: ts.InterfaceDeclaration): boolean =>
  Array.some(declaration.members, (member) => {
    const isProperty = ts.isPropertySignature(member)
    const isIndex = ts.isIndexSignatureDeclaration(member)
    const dataMemberChecks = Array.make(isProperty, isIndex)

    return Array.some(dataMemberChecks, Boolean)
  }) || declaration.heritageClauses !== undefined

const aliasCarriesData = (declaration: ts.TypeAliasDeclaration): boolean => {
  const type = declaration.type
  const isFunction = ts.isFunctionTypeNode(type)
  const isConstructor = ts.isConstructorTypeNode(type)
  const exclusions = Array.make(isFunction, isConstructor)

  return Array.every(exclusions, (excluded) => !excluded)
}

const runtimeSchemaType = (
  checker: ts.TypeChecker,
  declaration: ts.VariableDeclaration
): boolean => {
  const type = checker.getTypeAtLocation(declaration.name)
  const text = checker.typeToString(
    type,
    declaration.name,
    ts.TypeFormatFlags.NoTruncation
  )

  return text.includes("Schema<") || text.startsWith("Schema.")
}

const fieldIsMethod = (symbol: ts.Symbol): boolean => {
  const declarations = symbol.declarations ?? Array.empty()

  return Array.some(declarations, (declaration) => {
    const isMethod = ts.isMethodDeclaration(declaration)
    const isMethodSignature = ts.isMethodSignature(declaration)
    const isAccessor =
      ts.isGetAccessorDeclaration(declaration) ||
      ts.isSetAccessorDeclaration(declaration)

    const methodChecks = Array.make(isMethod, isMethodSignature, isAccessor)

    return Array.some(methodChecks, Boolean)
  })
}

const fieldIsDomainData = (symbol: ts.Symbol): boolean => {
  const name = symbol.getName()
  const isInternal = name.startsWith("__")
  const isKnownMethod = HashSet.has(ignoredFieldNames, name)
  const isMethod = fieldIsMethod(symbol)
  const exclusions = Array.make(isInternal, isKnownMethod, isMethod)

  return Array.every(exclusions, (excluded) => !excluded)
}

const fieldsFor = (
  checker: ts.TypeChecker,
  nameNode: ts.Identifier
): ReadonlyArray<ts.Symbol> => {
  const type = checker.getTypeAtLocation(nameNode)

  return pipe(type.getProperties(), Array.filter(fieldIsDomainData))
}

const fieldTypeText =
  (checker: ts.TypeChecker) =>
  (field: ts.Symbol): string => {
    const declaration = pipe(
      field.declarations ?? Array.empty(),
      Array.head,
      Option.getOrElse(Function.constant(field.valueDeclaration))
    )

    const location = declaration ?? field.valueDeclaration
    const type = pipe(
      Option.fromNullable(location),
      Option.map((node) => checker.getTypeOfSymbolAtLocation(field, node)),
      Option.getOrElse(() => checker.getDeclaredTypeOfSymbol(field))
    )

    return checker.typeToString(type, location, ts.TypeFormatFlags.NoTruncation)
  }

const declarationHasComparableShape = (
  declaration: DataStructureDeclaration
): boolean => {
  if (ts.isTypeAliasDeclaration(declaration)) {
    return ts.isTypeLiteralNode(declaration.type)
  }

  return (
    ts.isClassDeclaration(declaration) || ts.isInterfaceDeclaration(declaration)
  )
}

const shapeFor = (
  checker: ts.TypeChecker,
  fields: ReadonlyArray<ts.Symbol>
): Option.Option<string> => {
  if (fields.length === 0) {
    return Option.none()
  }

  const describe = fieldTypeText(checker)
  const parts = pipe(
    fields,
    Array.map((field) => `${field.getName()}:${describe(field)}`),
    Array.sort(Order.string)
  )

  return pipe(parts, Array.join("|"), Option.some)
}

const entryForDeclaration = (
  checker: ts.TypeChecker,
  declaration: DataStructureDeclaration,
  documentationNode: ts.Node,
  nameNode: ts.Identifier,
  exported: boolean
): Option.Option<DataStructureEntry> =>
  pipe(
    symbolAt(checker)(nameNode),
    Option.map((symbol) => {
      const fieldSymbols = fieldsFor(checker, nameNode)
      const shape = declarationHasComparableShape(declaration)
        ? shapeFor(checker, fieldSymbols)
        : Option.none<string>()
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

const declarationEntry = (
  checker: ts.TypeChecker,
  statement: ts.Statement
): ReadonlyArray<DataStructureEntry> => {
  const exported = hasExportModifier(statement)

  if (
    ts.isClassDeclaration(statement) &&
    statement.name !== undefined &&
    classIsDataStructure(statement)
  ) {
    return pipe(
      entryForDeclaration(
        checker,
        statement,
        statement,
        statement.name,
        exported
      ),
      Option.toArray
    )
  }

  if (ts.isInterfaceDeclaration(statement) && interfaceCarriesData(statement)) {
    return pipe(
      entryForDeclaration(
        checker,
        statement,
        statement,
        statement.name,
        exported
      ),
      Option.toArray
    )
  }

  if (ts.isTypeAliasDeclaration(statement) && aliasCarriesData(statement)) {
    return pipe(
      entryForDeclaration(
        checker,
        statement,
        statement,
        statement.name,
        exported
      ),
      Option.toArray
    )
  }

  if (ts.isEnumDeclaration(statement)) {
    return pipe(
      entryForDeclaration(
        checker,
        statement,
        statement,
        statement.name,
        exported
      ),
      Option.toArray
    )
  }

  if (!ts.isVariableStatement(statement) || !exported) {
    return Array.empty()
  }

  return Array.filterMap(
    statement.declarationList.declarations,
    (declaration) =>
      pipe(
        Option.liftPredicate(ts.isIdentifier)(declaration.name),
        Option.filter(() => runtimeSchemaType(checker, declaration)),
        Option.flatMap((nameNode) =>
          entryForDeclaration(
            checker,
            declaration,
            statement,
            nameNode,
            exported
          )
        )
      )
  )
}

const dataStructureEntries = (
  context: ProgramContext
): ReadonlyArray<DataStructureEntry> => {
  const sourceFiles = pipe(
    context.program.getSourceFiles(),
    Array.filter(isProjectSourceFile)
  )

  const declarations = Array.flatMap(sourceFiles, (sourceFile) =>
    Array.flatMap(sourceFile.statements, (statement) =>
      declarationEntry(context.checker, statement)
    )
  )

  return Array.dedupeWith(
    declarations,
    (first, second) => first.symbol === second.symbol
  )
}

const functionEntryForDeclaration = (
  checker: ts.TypeChecker,
  declaration: ts.FunctionDeclaration
): Option.Option<FunctionEntry> =>
  pipe(
    Option.fromNullable(declaration.name),
    Option.flatMap((nameNode) =>
      pipe(
        symbolAt(checker)(nameNode),
        Option.map(
          (symbol) =>
            new FunctionEntry({
              symbol,
              definition: Option.some(declaration),
              nameNode,
              name: nameNode.text,
              sourceFile: declaration.getSourceFile(),
              exported: hasExportModifier(declaration)
            })
        )
      )
    )
  )

const functionEntryForVariable = (
  checker: ts.TypeChecker,
  declaration: ts.VariableDeclaration,
  exported: boolean,
  dataBySymbol: HashMap.HashMap<ts.Symbol, DataStructureEntry>
): Option.Option<FunctionEntry> =>
  pipe(
    Option.liftPredicate(ts.isIdentifier)(declaration.name),
    Option.flatMap((nameNode) =>
      pipe(
        symbolAt(checker)(nameNode),
        Option.filter((symbol) => !HashMap.has(dataBySymbol, symbol)),
        Option.filter(() => {
          const type = checker.getTypeAtLocation(nameNode)

          return type.getCallSignatures().length > 0
        }),
        Option.map((symbol) => {
          const definition = functionInitializer(declaration)

          return new FunctionEntry({
            symbol,
            definition,
            nameNode,
            name: nameNode.text,
            sourceFile: declaration.getSourceFile(),
            exported
          })
        })
      )
    )
  )

const functionEntryForMethod = (
  checker: ts.TypeChecker,
  declaration: ts.MethodDeclaration
): Option.Option<FunctionEntry> =>
  pipe(
    Option.liftPredicate(ts.isIdentifier)(declaration.name),
    Option.flatMap((nameNode) =>
      pipe(
        symbolAt(checker)(nameNode),
        Option.map(
          (symbol) =>
            new FunctionEntry({
              symbol,
              definition: Option.some(declaration),
              nameNode,
              name: nameNode.text,
              sourceFile: declaration.getSourceFile(),
              exported: false
            })
        )
      )
    )
  )

const functionEntries = (
  context: ProgramContext,
  dataBySymbol: HashMap.HashMap<ts.Symbol, DataStructureEntry>
): ReadonlyArray<FunctionEntry> => {
  const sourceFiles = pipe(
    context.program.getSourceFiles(),
    Array.filter(isProjectSourceFile)
  )

  return Array.flatMap(sourceFiles, (sourceFile) =>
    pipe(
      astNodesIn(sourceFile),
      Array.fromIterable,
      Array.filterMap((node) => {
        if (ts.isFunctionDeclaration(node)) {
          return functionEntryForDeclaration(context.checker, node)
        }

        if (ts.isMethodDeclaration(node)) {
          return functionEntryForMethod(context.checker, node)
        }

        if (!ts.isVariableDeclaration(node)) {
          return Option.none()
        }

        const statement = node.parent.parent
        const exported =
          ts.isVariableStatement(statement) && hasExportModifier(statement)

        return functionEntryForVariable(
          context.checker,
          node,
          exported,
          dataBySymbol
        )
      })
    )
  )
}

const addOwner = (
  index: MutableHashMap.MutableHashMap<
    ts.Symbol,
    MutableHashSet.MutableHashSet<ts.Symbol>
  >,
  target: ts.Symbol,
  owner: ts.Symbol
): void => {
  const existing = MutableHashMap.get(index, target)
  const owners = pipe(
    existing,
    Option.getOrElse(() => MutableHashSet.empty<ts.Symbol>())
  )

  MutableHashSet.add(owners, owner)
  MutableHashMap.set(index, target, owners)
}

const immutableOwnerIndex = (
  mutable: MutableHashMap.MutableHashMap<
    ts.Symbol,
    MutableHashSet.MutableHashSet<ts.Symbol>
  >
): HashMap.HashMap<ts.Symbol, HashSet.HashSet<ts.Symbol>> =>
  pipe(
    MutableHashMap.keys(mutable),
    Array.map((symbol) => {
      const owners = pipe(
        MutableHashMap.get(mutable, symbol),
        Option.map(HashSet.fromIterable),
        Option.getOrElse(HashSet.empty)
      )

      return Tuple.make(symbol, owners)
    }),
    HashMap.fromIterable
  )

const topLevelStatement = (node: ts.Node): Option.Option<ts.Statement> => {
  const ancestors = Iterable.unfold<ts.Node, ts.Node>(node, (current) =>
    pipe(
      Option.fromNullable(current.parent),
      Option.map((parent) => Tuple.make(current, parent))
    )
  )

  return pipe(
    ancestors,
    Iterable.findFirst(
      (candidate): candidate is ts.Statement =>
        ts.isSourceFile(candidate.parent) && ts.isStatement(candidate)
    )
  )
}

const nodeInside =
  (node: ts.Node) =>
  (candidate: ts.Node): boolean =>
    node.pos >= candidate.pos && node.end <= candidate.end

const statementOwnerName = (
  node: ts.Node,
  statement: ts.Statement
): Option.Option<ts.DeclarationName> => {
  if (ts.isVariableStatement(statement)) {
    return pipe(
      statement.declarationList.declarations,
      Array.findFirst(nodeInside(node)),
      Option.map(Struct.get("name"))
    )
  }

  if (
    ts.isFunctionDeclaration(statement) ||
    ts.isClassDeclaration(statement) ||
    ts.isInterfaceDeclaration(statement) ||
    ts.isTypeAliasDeclaration(statement) ||
    ts.isEnumDeclaration(statement)
  ) {
    return Option.fromNullable(statement.name)
  }

  return Option.none()
}

const functionOwnerName = (node: ts.Node): Option.Option<ts.Identifier> => {
  if (
    (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) &&
    node.name !== undefined &&
    ts.isIdentifier(node.name)
  ) {
    return Option.some(node.name)
  }

  if (!ts.isArrowFunction(node) && !ts.isFunctionExpression(node)) {
    return Option.none()
  }

  if (ts.isFunctionExpression(node) && node.name !== undefined) {
    return Option.some(node.name)
  }

  return pipe(
    Option.liftPredicate(ts.isVariableDeclaration)(node.parent),
    Option.map(Struct.get("name")),
    Option.filter(ts.isIdentifier)
  )
}

const ownerSymbol = (
  checker: ts.TypeChecker,
  functionBySymbol: HashMap.HashMap<ts.Symbol, FunctionEntry>,
  node: ts.Node
): Option.Option<ts.Symbol> => {
  let current = node.parent

  while (current !== undefined) {
    const functionSymbol = pipe(
      functionOwnerName(current),
      Option.flatMap(symbolAt(checker)),
      Option.filter((symbol) => HashMap.has(functionBySymbol, symbol))
    )

    if (Option.isSome(functionSymbol)) {
      return functionSymbol
    }

    current = current.parent
  }

  return pipe(
    topLevelStatement(node),
    Option.flatMap((statement) => statementOwnerName(node, statement)),
    Option.flatMap(symbolAt(checker))
  )
}

const declarationNameIs = (
  node: ts.Identifier,
  entry: DataStructureEntry | FunctionEntry
): boolean => node === entry.nameNode

const fieldModelIndex = (
  dataStructures: ReadonlyArray<DataStructureEntry>
): HashMap.HashMap<ts.Symbol, DataStructureEntry> =>
  pipe(
    dataStructures,
    Array.flatMap((entry) =>
      Array.map(entry.fieldSymbols, (field) => Tuple.make(field, entry))
    ),
    HashMap.fromIterable
  )

const mechanicalForwardingRead = (node: ts.Node): boolean => {
  if (!ts.isIdentifier(node) || !ts.isPropertyAccessExpression(node.parent)) {
    return false
  }

  const access = node.parent
  const parent = access.parent

  if (!ts.isPropertyAssignment(parent) || parent.initializer !== access) {
    return false
  }

  return parent.name.getText() === access.name.text
}

const modelFromResolvedType =
  (checker: ts.TypeChecker) =>
  (dataBySymbol: HashMap.HashMap<ts.Symbol, DataStructureEntry>) =>
  (type: ts.Type): Option.Option<DataStructureEntry> => {
    const symbol = type.aliasSymbol ?? type.getSymbol()

    return pipe(
      Option.fromNullable(symbol),
      Option.map(canonicalSymbol(checker)),
      Option.flatMap((candidate) => HashMap.get(dataBySymbol, candidate))
    )
  }

const modelFromType = (
  checker: ts.TypeChecker,
  dataBySymbol: HashMap.HashMap<ts.Symbol, DataStructureEntry>,
  node: ts.Node
): Option.Option<DataStructureEntry> =>
  pipe(
    checker.getTypeAtLocation(node),
    modelFromResolvedType(checker)(dataBySymbol)
  )

const modelsFromResolvedType = (
  checker: ts.TypeChecker,
  dataBySymbol: HashMap.HashMap<ts.Symbol, DataStructureEntry>,
  type: ts.Type
): ReadonlyArray<DataStructureEntry> => {
  const direct = pipe(
    type,
    modelFromResolvedType(checker)(dataBySymbol),
    Option.toArray
  )

  if (direct.length > 0) {
    return direct
  }

  if (!type.isUnionOrIntersection()) {
    return Array.empty()
  }

  return Array.flatMap(type.types, (member) =>
    modelsFromResolvedType(checker, dataBySymbol, member)
  )
}

const fieldReferences = (
  checker: ts.TypeChecker,
  dataBySymbol: HashMap.HashMap<ts.Symbol, DataStructureEntry>,
  fields: HashMap.HashMap<ts.Symbol, DataStructureEntry>,
  node: ts.Identifier,
  symbol: ts.Symbol
): ReadonlyArray<readonly [DataStructureEntry, ts.Symbol]> => {
  const direct = HashMap.get(fields, symbol)

  if (Option.isSome(direct)) {
    return Array.make(Tuple.make(direct.value, symbol))
  }

  if (
    !ts.isPropertyAccessExpression(node.parent) ||
    node.parent.name !== node
  ) {
    return Array.empty()
  }

  const receiverType = checker.getTypeAtLocation(node.parent.expression)
  const models = modelsFromResolvedType(checker, dataBySymbol, receiverType)

  return Array.filterMap(models, (model) =>
    pipe(
      model.fieldSymbols,
      Array.findFirst((field) => field.getName() === node.text),
      Option.map((field) => Tuple.make(model, field))
    )
  )
}

const modelFromConstruction = (
  checker: ts.TypeChecker,
  dataBySymbol: HashMap.HashMap<ts.Symbol, DataStructureEntry>,
  expression: ts.Expression
): Option.Option<DataStructureEntry> => {
  const unwrapped = unwrapTransparentExpression(expression)

  if (ts.isObjectLiteralExpression(unwrapped)) {
    return pipe(
      checker.getContextualType(unwrapped),
      Option.fromNullable,
      Option.flatMap(modelFromResolvedType(checker)(dataBySymbol))
    )
  }

  if (ts.isNewExpression(unwrapped)) {
    return pipe(
      symbolAt(checker)(unwrapCallee(unwrapped.expression)),
      Option.flatMap((symbol) => HashMap.get(dataBySymbol, symbol))
    )
  }

  if (!ts.isCallExpression(unwrapped)) {
    return Option.none()
  }

  const callee = unwrapCallee(unwrapped.expression)

  if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "make") {
    return Option.none()
  }

  return pipe(
    symbolAt(checker)(unwrapCallee(callee.expression)),
    Option.flatMap((symbol) => HashMap.get(dataBySymbol, symbol))
  )
}

const returnedExpression = (
  definition: FunctionDefinition
): Option.Option<ts.Expression> => {
  if (ts.isArrowFunction(definition) && !ts.isBlock(definition.body)) {
    return Option.some(definition.body)
  }

  const body = definition.body

  if (body === undefined || !ts.isBlock(body)) {
    return Option.none()
  }

  const returns = Array.filter(body.statements, ts.isReturnStatement)

  if (returns.length !== 1) {
    return Option.none()
  }

  return Option.fromNullable(returns[0].expression)
}

const constructionObject = (
  expression: ts.Expression
): Option.Option<ts.ObjectLiteralExpression> => {
  const unwrapped = unwrapTransparentExpression(expression)

  if (ts.isObjectLiteralExpression(unwrapped)) {
    return Option.some(unwrapped)
  }

  if (ts.isNewExpression(unwrapped) || ts.isCallExpression(unwrapped)) {
    return pipe(
      unwrapped.arguments ?? Array.empty(),
      Array.head,
      Option.map(unwrapTransparentExpression),
      Option.filter(ts.isObjectLiteralExpression)
    )
  }

  return Option.none()
}

const propertyCopiesParameter = (
  parameter: ts.Identifier,
  property: ts.ObjectLiteralElementLike
): boolean => {
  if (ts.isSpreadAssignment(property)) {
    const expression = unwrapTransparentExpression(property.expression)

    return ts.isIdentifier(expression) && expression.text === parameter.text
  }

  if (!ts.isPropertyAssignment(property)) {
    return false
  }

  const initializer = unwrapTransparentExpression(property.initializer)

  if (!ts.isPropertyAccessExpression(initializer)) {
    return false
  }

  const receiver = unwrapTransparentExpression(initializer.expression)
  const isParameter =
    ts.isIdentifier(receiver) && receiver.text === parameter.text
  const sameField = property.name.getText() === initializer.name.text
  const copyChecks = Array.make(isParameter, sameField)

  return Array.every(copyChecks, Boolean)
}

const parameterModel = (
  checker: ts.TypeChecker,
  dataBySymbol: HashMap.HashMap<ts.Symbol, DataStructureEntry>,
  definition: FunctionDefinition
): Option.Option<readonly [ts.Identifier, DataStructureEntry]> => {
  const models = Array.filterMap(definition.parameters, (parameter) =>
    pipe(
      Option.liftPredicate(ts.isIdentifier)(parameter.name),
      Option.flatMap((name) =>
        pipe(
          modelFromType(checker, dataBySymbol, parameter),
          Option.map((model) => Tuple.make(name, model))
        )
      )
    )
  )

  return models.length === 1 ? Option.some(models[0]) : Option.none()
}

const returnModel = (
  checker: ts.TypeChecker,
  dataBySymbol: HashMap.HashMap<ts.Symbol, DataStructureEntry>,
  definition: FunctionDefinition,
  expression: ts.Expression
): Option.Option<DataStructureEntry> => {
  const constructed = modelFromConstruction(checker, dataBySymbol, expression)

  if (Option.isSome(constructed)) {
    return constructed
  }

  const signature = checker.getSignatureFromDeclaration(definition)

  return pipe(
    Option.fromNullable(signature),
    Option.map((resolved) => checker.getReturnTypeOfSignature(resolved)),
    Option.flatMap((type) => {
      const symbol = type.aliasSymbol ?? type.getSymbol()

      return pipe(
        Option.fromNullable(symbol),
        Option.map(canonicalSymbol(checker)),
        Option.flatMap((candidate) => HashMap.get(dataBySymbol, candidate))
      )
    })
  )
}

const modelShapesMatch = (
  source: DataStructureEntry,
  target: DataStructureEntry
): boolean => {
  const sourceShape = source.shape
  const targetShape = target.shape

  if (Option.isNone(sourceShape)) {
    return false
  }

  if (Option.isNone(targetShape)) {
    return false
  }

  return sourceShape.value === targetShape.value
}

const passThroughConversion = (
  checker: ts.TypeChecker,
  dataBySymbol: HashMap.HashMap<ts.Symbol, DataStructureEntry>,
  entry: FunctionEntry
): Option.Option<PassThroughConversion> =>
  pipe(
    entry.definition,
    Option.flatMap((definition) =>
      pipe(
        parameterModel(checker, dataBySymbol, definition),
        Option.flatMap(([parameter, source]) =>
          pipe(
            returnedExpression(definition),
            Option.flatMap((expression) =>
              pipe(
                constructionObject(expression),
                Option.filter((literal) => literal.properties.length > 0),
                Option.filter((literal) =>
                  Array.every(literal.properties, (property) =>
                    propertyCopiesParameter(parameter, property)
                  )
                ),
                Option.flatMap(() =>
                  pipe(
                    returnModel(checker, dataBySymbol, definition, expression),
                    Option.filter((target) => target.symbol !== source.symbol),
                    Option.filter((target) => modelShapesMatch(source, target)),
                    Option.map(
                      (target) =>
                        new PassThroughConversion({
                          source,
                          target,
                          functionEntry: entry,
                          node: expression
                        })
                    )
                  )
                )
              )
            )
          )
        )
      )
    )
  )

const classHasInvariant = (entry: DataStructureEntry): boolean => {
  if (!ts.isClassDeclaration(entry.declaration)) {
    return false
  }

  return Iterable.some(astNodesIn(entry.declaration), (node) =>
    ts.isIdentifier(node) ? HashSet.has(invariantMemberNames, node.text) : false
  )
}

const declarationIsProtocol = (entry: DataStructureEntry): boolean => {
  if (ts.isClassDeclaration(entry.declaration)) {
    return pipe(
      entry.declaration,
      classDataMember,
      Option.exists((member) => member !== "Class")
    )
  }

  const isUnion =
    ts.isTypeAliasDeclaration(entry.declaration) &&
    ts.isUnionTypeNode(entry.declaration.type)
  const isEnum = ts.isEnumDeclaration(entry.declaration)
  const protocolChecks = Array.make(isUnion, isEnum)

  return Array.some(protocolChecks, Boolean)
}

const declarationSelfReference = (
  checker: ts.TypeChecker,
  entry: DataStructureEntry
): boolean =>
  Iterable.some(astNodesIn(entry.declaration), (node) => {
    if (!ts.isIdentifier(node) || node === entry.nameNode) {
      return false
    }

    if (
      ts.isClassDeclaration(entry.declaration) &&
      entry.declaration.heritageClauses !== undefined &&
      Array.some(entry.declaration.heritageClauses, nodeInside(node))
    ) {
      return false
    }

    return pipe(
      symbolAt(checker)(node),
      Option.exists((symbol) => symbol === entry.symbol)
    )
  })

const classExtendsSchema = (entry: DataStructureEntry): boolean => {
  if (!ts.isClassDeclaration(entry.declaration)) {
    return false
  }

  const clauses = entry.declaration.heritageClauses ?? Array.empty()
  const types = Array.flatMap(clauses, Struct.get("types"))

  return Array.some(types, (type) => {
    const callee = unwrapCallee(type.expression)

    return (
      ts.isPropertyAccessExpression(callee) &&
      ts.isIdentifier(callee.expression) &&
      callee.expression.text === "Schema"
    )
  })
}

const declarationIsRuntimeSchema = (
  checker: ts.TypeChecker,
  entry: DataStructureEntry
): boolean => {
  const declarations = entry.symbol.declarations ?? Array.empty()
  const variableSchema = Array.some(
    declarations,
    (declaration) =>
      ts.isVariableDeclaration(declaration) &&
      runtimeSchemaType(checker, declaration)
  )

  return variableSchema || classExtendsSchema(entry)
}

const structuralRoles = (
  checker: ts.TypeChecker,
  dataStructures: ReadonlyArray<DataStructureEntry>,
  ownersByData: HashMap.HashMap<ts.Symbol, HashSet.HashSet<ts.Symbol>>,
  ownersByFunction: HashMap.HashMap<ts.Symbol, HashSet.HashSet<ts.Symbol>>,
  functionBySymbol: HashMap.HashMap<ts.Symbol, FunctionEntry>
): HashMap.HashMap<ts.Symbol, HashSet.HashSet<ModelRole>> =>
  pipe(
    dataStructures,
    Array.map((entry) => {
      const owners = pipe(
        HashMap.get(ownersByData, entry.symbol),
        Option.getOrElse(HashSet.empty)
      )
      const roles = HashSet.empty<ModelRole>()
      const directlyShared = HashSet.size(owners) >= 2
      const sharedThroughFunction = HashSet.some(owners, (owner) =>
        pipe(
          HashMap.get(ownersByFunction, owner),
          Option.exists((callers) => HashSet.size(callers) >= 2)
        )
      )
      const shared = directlyShared || sharedThroughFunction
      const usedByExportedFunction = HashSet.some(owners, (owner) =>
        pipe(
          HashMap.get(functionBySymbol, owner),
          Option.exists(Struct.get("exported"))
        )
      )
      const isRuntimeSchema = declarationIsRuntimeSchema(checker, entry)
      const boundaryEvidence = Array.make(
        usedByExportedFunction,
        isRuntimeSchema
      )
      const boundary = entry.exported && Array.some(boundaryEvidence, Boolean)
      const invariant = classHasInvariant(entry)
      const protocol = declarationIsProtocol(entry)
      const recursive = declarationSelfReference(checker, entry)
      const observations: ReadonlyArray<readonly [ModelRole, boolean]> =
        Array.make(
          Tuple.make("shared" as const, shared),
          Tuple.make("boundary" as const, boundary),
          Tuple.make("invariant" as const, invariant),
          Tuple.make("protocol" as const, protocol),
          Tuple.make("recursive" as const, recursive)
        )
      const established = Array.filter(
        observations,
        (observation) => observation[1]
      )
      const completed = Array.reduce(
        established,
        roles,
        (current, observation) => HashSet.add(current, observation[0])
      )

      return Tuple.make(entry.symbol, completed)
    }),
    HashMap.fromIterable
  )

const shapeGroups = (
  dataStructures: ReadonlyArray<DataStructureEntry>
): HashMap.HashMap<string, ReadonlyArray<DataStructureEntry>> =>
  Array.reduce(
    dataStructures,
    HashMap.empty<string, ReadonlyArray<DataStructureEntry>>(),
    (groups, entry) =>
      pipe(
        entry.shape,
        Option.map((shape) => {
          const group = pipe(
            HashMap.get(groups, shape),
            Option.getOrElse(Array.empty)
          )

          return HashMap.set(groups, shape, Array.append(group, entry))
        }),
        Option.getOrElse(Function.constant(groups))
      )
  )

const structuralRoleStem = (name: string): Option.Option<string> =>
  pipe(
    structuralRoleSuffixes,
    Iterable.findFirst((suffix) => name.endsWith(suffix)),
    Option.map((suffix) => name.slice(0, -suffix.length)),
    Option.filter((stem) => stem.length > 0)
  )

export const functionDerivedStem = structuralRoleStem

export const buildConceptIndex = (context: ProgramContext): ConceptIndex => {
  const checker = context.checker
  const dataStructures = dataStructureEntries(context)
  const dataBySymbol = pipe(
    dataStructures,
    Array.map((entry) => Tuple.make(entry.symbol, entry)),
    HashMap.fromIterable
  )
  const functions = functionEntries(context, dataBySymbol)
  const functionBySymbol = pipe(
    functions,
    Array.map((entry) => Tuple.make(entry.symbol, entry)),
    HashMap.fromIterable
  )
  const ownersByDataMutable = MutableHashMap.empty<
    ts.Symbol,
    MutableHashSet.MutableHashSet<ts.Symbol>
  >()
  const ownersByFunctionMutable = MutableHashMap.empty<
    ts.Symbol,
    MutableHashSet.MutableHashSet<ts.Symbol>
  >()
  const fields = fieldModelIndex(dataStructures)
  const fieldReads = MutableList.empty<FieldRead>()
  const readFieldNames = MutableHashSet.empty<string>()
  const parameterBags = MutableList.empty<ParameterBag>()
  const sourceFiles = pipe(
    context.program.getSourceFiles(),
    Array.filter(isProjectSourceFile)
  )

  Array.forEach(sourceFiles, (sourceFile) => {
    Iterable.forEach(astNodesIn(sourceFile), (node) => {
      if (ts.isIdentifier(node)) {
        const maybeSymbol = symbolAt(checker)(node)
        const owner = ownerSymbol(checker, functionBySymbol, node)

        if (Option.isSome(maybeSymbol)) {
          const symbol = maybeSymbol.value
          const data = HashMap.get(dataBySymbol, symbol)
          const fn = HashMap.get(functionBySymbol, symbol)
          const references = fieldReferences(
            checker,
            dataBySymbol,
            fields,
            node,
            symbol
          )

          if (
            Option.isSome(data) &&
            !declarationNameIs(node, data.value) &&
            Option.isSome(owner) &&
            owner.value !== symbol
          ) {
            addOwner(ownersByDataMutable, symbol, owner.value)
          }

          if (
            Option.isSome(fn) &&
            !declarationNameIs(node, fn.value) &&
            Option.isSome(owner) &&
            owner.value !== symbol
          ) {
            addOwner(ownersByFunctionMutable, symbol, owner.value)
          }

          const fieldIsDeclaration = pipe(
            symbol.declarations ?? Array.empty(),
            Array.some(
              (declaration) => ts.getNameOfDeclaration(declaration) === node
            )
          )

          const isIndependentRead = Array.make(
            !fieldIsDeclaration,
            !mechanicalForwardingRead(node)
          )

          if (Array.every(isIndependentRead, Boolean)) {
            Array.forEach(references, ([model, field]) => {
              MutableList.append(
                fieldReads,
                new FieldRead({ model, field, owner, node })
              )
            })
          }
        }
      }

      if (!ts.isCallExpression(node)) {
        return
      }

      const callee = unwrapCallee(node.expression)
      const firstArgument = pipe(node.arguments, Array.head)
      const structField = pipe(
        Option.liftPredicate(ts.isPropertyAccessExpression)(callee),
        Option.filter((access) => access.name.text === "get"),
        Option.filter((access) =>
          ts.isIdentifier(access.expression)
            ? access.expression.text === "Struct"
            : false
        ),
        Option.flatMap(() => firstArgument),
        Option.filter(ts.isStringLiteralLike),
        Option.map(Struct.get("text"))
      )

      if (Option.isSome(structField)) {
        MutableHashSet.add(readFieldNames, structField.value)
      }

      const called = pipe(
        symbolAt(checker)(callee),
        Option.flatMap((symbol) => HashMap.get(functionBySymbol, symbol))
      )

      if (Option.isNone(called)) {
        return
      }

      Array.forEach(node.arguments, (argument) => {
        const model = modelFromConstruction(checker, dataBySymbol, argument)

        if (Option.isSome(model)) {
          MutableList.append(
            parameterBags,
            new ParameterBag({
              model: model.value,
              functionEntry: called.value,
              node: argument
            })
          )
        }
      })
    })
  })

  const ownersByData = immutableOwnerIndex(ownersByDataMutable)
  const ownersByFunction = immutableOwnerIndex(ownersByFunctionMutable)
  const rolesByData = structuralRoles(
    checker,
    dataStructures,
    ownersByData,
    ownersByFunction,
    functionBySymbol
  )
  const conversions = Array.filterMap(
    functions,
    (entry): Option.Option<PassThroughConversion> =>
      passThroughConversion(checker, dataBySymbol, entry)
  )

  return new ConceptIndex({
    projectRoot: context.projectRoot,
    dataStructures,
    functions,
    dataBySymbol,
    functionBySymbol,
    ownersByData,
    ownersByFunction,
    rolesByData,
    fieldReads: Array.fromIterable(fieldReads),
    readFieldNames: HashSet.fromIterable(readFieldNames),
    shapeGroups: shapeGroups(dataStructures),
    passThroughConversions: conversions,
    parameterBags: Array.fromIterable(parameterBags)
  })
}
