import {
  Array,
  Equal,
  Function,
  Hash,
  HashMap,
  Iterable,
  MutableRef,
  Option,
  Order,
  Predicate,
  Result,
  Struct,
  Tuple,
  flow,
  pipe
} from "effect"
import * as ts from "typescript"
import { detection, fileSubscriptions } from "@better-typescript/core/engine/check"
import { withProgramIndex } from "../../defineCheck.js"
import { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { astNodesIn } from "@better-typescript/core/engine/sources"
import { sourceComments } from "@better-typescript/core/engine/sources/comments"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"
import { isFunctionInitializer, isInAmbientContext } from "./tsNode.js"
import type { FunctionInitializer } from "./tsNode.js"

const generatedNamePrefix = "__betterTypescriptInference"
const emptyFunctionInitializers = Array.empty<FunctionInitializer>()
const emptyDeclarations = Array.empty<ts.Declaration>()

const constFinding = Tuple.make(
  "Avoid a const annotation when its initializer infers the same type.",
  "Delete the type annotation. Keep annotations that widen a value or guide generic inference."
)

const returnFinding = Tuple.make(
  "Avoid a return annotation when the function body infers the same type.",
  "Delete the return type annotation. Keep explicit contracts when inference changes the signature."
)

const contextualFinding = Tuple.make(
  "Avoid annotations on a contextually typed function.",
  "Delete the parameter and return annotations together; the surrounding expression supplies them."
)

// InferenceProbe pairs source syntax with shadow declarations because both identify one finding.
class InferenceProbe implements Equal.Equal {
  constructor(
    readonly detectionNode: ts.Node,
    readonly insertionPosition: number,
    readonly snippet: string,
    readonly message: string,
    readonly hint: string
  ) {}

  [Equal.symbol](that: Equal.Equal): boolean {
    return this === that
  }

  [Hash.symbol]() {
    return Hash.random(this)
  }
}

const optionResult = <A>(option: Option.Option<A>) => Result.fromOption(option, Function.constVoid)

const editStart = (edit: readonly [number, number, string]) => edit[0]

const editOrder = Order.mapInput(Order.flip(Order.Number), editStart)

const applyEdits = (
  text: string,
  offset: number,
  edits: ReadonlyArray<readonly [number, number, string]>
) =>
  pipe(
    edits,
    Array.sort(editOrder),
    Array.reduce(
      text,
      (current, [start, end, replacement]) =>
        current.slice(0, start - offset) + replacement + current.slice(end - offset)
    )
  )

const annotationEdit = (sourceFile: ts.SourceFile, typeNode: ts.TypeNode, anchorEnd: number) => {
  const typeStart = typeNode.getStart(sourceFile)
  const colon = sourceFile.text.lastIndexOf(":", typeStart - 1)
  const validColon = colon >= anchorEnd
  const edit = Tuple.make(colon, typeNode.end, "")

  return validColon ? Option.some(edit) : Option.none()
}

const hasFunctionInitializerAncestor = (root: ts.Node, node: ts.Node): boolean => {
  const notRoot = node !== root

  return (
    notRoot &&
    pipe(
      Option.fromNullishOr(node.parent),
      Option.exists(
        (parent) => isFunctionInitializer(parent) || hasFunctionInitializerAncestor(root, parent)
      )
    )
  )
}

const functionInitializersIn = (root: ts.Node) =>
  pipe(
    astNodesIn(root),
    Iterable.filter(isFunctionInitializer),
    Iterable.filter((fn) => !hasFunctionInitializerAncestor(root, fn)),
    Array.fromIterable
  )

const typePredicate = (fn: FunctionInitializer) =>
  pipe(Option.fromNullishOr(fn.type), Option.exists(ts.isTypePredicateNode))

const supportedParameterType = (parameter: ts.ParameterDeclaration) => {
  const typeNode = Option.fromNullishOr(parameter.type)
  const named = ts.isIdentifier(parameter.name)
  const restToken = Option.fromNullishOr(parameter.dotDotDotToken)
  const questionToken = Option.fromNullishOr(parameter.questionToken)
  const initializer = Option.fromNullishOr(parameter.initializer)
  const isNotRest = Option.isNone(restToken)
  const isRequired = Option.isNone(questionToken)
  const hasNoInitializer = Option.isNone(initializer)
  const supportFlags = Array.make(named, isNotRest, isRequired, hasNoInitializer)
  const supported = Array.every(supportFlags, Boolean)

  return supported ? typeNode : Option.none()
}

const contextualParameterTypes = (checker: ts.TypeChecker) => (fn: FunctionInitializer) => {
  const contextualType = checker.getContextualType(fn)
  const contextualOption = Option.fromNullishOr(contextualType)
  const contextual = Option.isSome(contextualOption)
  const isNotPredicate = !typePredicate(fn)
  const eligibilityFlags = Array.make(contextual, isNotPredicate)
  const eligible = Array.every(eligibilityFlags, Boolean)

  return eligible
    ? pipe(fn.parameters, Array.filterMap(flow(supportedParameterType, optionResult)))
    : Array.empty()
}

const removableReturnType = (fn: FunctionInitializer) =>
  pipe(Option.fromNullishOr(fn.type), Option.filter(Predicate.not(ts.isTypePredicateNode)))

const functionBodyInDeclaration = (declaration: ts.Declaration) => {
  const variableBody = pipe(
    Option.liftPredicate(ts.isVariableDeclaration)(declaration),
    Option.flatMap((variable) => Option.fromNullishOr(variable.initializer)),
    Option.filter(isFunctionInitializer),
    Option.map(Struct.get("body"))
  )

  const declaredBody = pipe(
    Option.liftPredicate(ts.isFunctionDeclaration)(declaration),
    Option.flatMap((fn) => Option.fromNullishOr(fn.body))
  )

  return pipe(variableBody, Option.orElse(Function.constant(declaredBody)))
}

const symbolOptionAt = (checker: ts.TypeChecker) =>
  flow(checker.getSymbolAtLocation, Option.fromNullishOr)

const functionBodyForSymbol = (symbol: ts.Symbol) =>
  pipe(
    symbol.declarations ?? emptyDeclarations,
    Array.filterMap(flow(functionBodyInDeclaration, optionResult)),
    Array.head
  )

const symbolOccursThroughFunctions = (
  checker: ts.TypeChecker,
  target: ts.Symbol,
  root: ts.Node,
  seen: ReadonlyArray<ts.Symbol>
): boolean =>
  pipe(
    astNodesIn(root),
    Iterable.some((node) =>
      pipe(
        Option.liftPredicate(ts.isIdentifier)(node),
        Option.flatMap(symbolOptionAt(checker)),
        Option.exists((symbol) => {
          const targetMatch = symbol === target
          const unseen = !Array.some(seen, (candidate) => candidate === symbol)
          const body = functionBodyForSymbol(symbol)
          const unseenBody = pipe(body, Option.filter(Function.constant(unseen)))
          const nextSeen = Array.append(seen, symbol)

          const dependencyMatch = Option.exists(unseenBody, (dependencyBody) =>
            symbolOccursThroughFunctions(checker, target, dependencyBody, nextSeen)
          )

          const matches = Array.make(targetMatch, dependencyMatch)

          return Array.some(matches, Boolean)
        })
      )
    )
  )

const declarationRecurses =
  (checker: ts.TypeChecker) =>
  (identifier: ts.Identifier, root: ts.Node): boolean =>
    pipe(
      identifier,
      symbolOptionAt(checker),
      Option.exists((target) =>
        pipe(target, Array.of, (seen) => symbolOccursThroughFunctions(checker, target, root, seen))
      )
    )

const expectedName = (probe: InferenceProbe) =>
  `${generatedNamePrefix}Expected${probe.detectionNode.getStart()}`

const probeName = (probe: InferenceProbe) =>
  `${generatedNamePrefix}Probe${probe.detectionNode.getStart()}`

const variableProbe = (checker: ts.TypeChecker) => (declaration: ts.VariableDeclaration) => {
  const name = Option.liftPredicate(ts.isIdentifier)(declaration.name)
  const initializer = Option.fromNullishOr(declaration.initializer)
  const statement = Option.liftPredicate(ts.isVariableStatement)(declaration.parent.parent)
  const outerType = Option.fromNullishOr(declaration.type)

  const functions = pipe(
    initializer,
    Option.map(functionInitializersIn),
    Option.getOrElse(Function.constant(emptyFunctionInitializers))
  )

  const functionAnnotated = Array.some(functions, (fn) => {
    const returnType = removableReturnType(fn)
    const returnAnnotated = Option.isSome(returnType)

    const parameterAnnotated = Array.some(
      fn.parameters,
      flow(Struct.get("type"), Option.fromNullishOr, Option.isSome)
    )

    const annotationFlags = Array.make(returnAnnotated, parameterAnnotated)

    return Array.some(annotationFlags, Boolean)
  })

  const outerAnnotated = Option.isSome(outerType)
  const candidateFlags = Array.make(outerAnnotated, functionAnnotated)
  const hasCandidate = Array.some(candidateFlags, Boolean)
  const parts = Option.all({ name, initializer, statement })

  return pipe(
    parts,
    Option.filter(Function.constant(hasCandidate)),
    Option.filter(({ name: identifier, initializer: expression, statement: variableStatement }) => {
      const isConst = (declaration.parent.flags & ts.NodeFlags.Const) !== 0
      const recursive = declarationRecurses(checker)(identifier, expression)
      const ambient = isInAmbientContext(variableStatement)
      const eligibility = Array.make(isConst, !recursive, !ambient)

      return Array.every(eligibility, Boolean)
    }),
    Option.flatMap(({ initializer: expression, statement: variableStatement }) => {
      const sourceFile = declaration.getSourceFile()
      const parameterTypes = Array.flatMap(functions, contextualParameterTypes(checker))
      const returnTypes = pipe(functions, Array.filterMap(flow(removableReturnType, optionResult)))
      const firstReturnType = Array.head(returnTypes)

      const detectionNode = pipe(
        Array.head(parameterTypes),
        Option.orElse(Function.constant(outerType)),
        Option.orElse(Function.constant(firstReturnType))
      )

      return pipe(
        detectionNode,
        Option.map((node) => {
          const parameterEdits = pipe(
            parameterTypes,
            Array.filterMap((typeNode) => {
              const parameter = typeNode.parent

              const edit = ts.isParameter(parameter)
                ? annotationEdit(sourceFile, typeNode, parameter.name.end)
                : Option.none()

              return optionResult(edit)
            })
          )

          const returnEdits = pipe(
            returnTypes,
            Array.filterMap((typeNode) => {
              const fn = typeNode.parent

              const edit = isFunctionInitializer(fn)
                ? annotationEdit(sourceFile, typeNode, fn.parameters.end)
                : Option.none()

              return optionResult(edit)
            })
          )

          const edits = Array.appendAll(parameterEdits, returnEdits)
          const initializerSource = expression.getText(sourceFile)
          const initializerStart = expression.getStart(sourceFile)
          const modifiedInitializer = applyEdits(initializerSource, initializerStart, edits)

          const typeSource = pipe(
            outerType,
            Option.map((typeNode) => `: ${typeNode.getText(sourceFile)}`),
            Option.getOrElse(Function.constant(""))
          )

          const expected = `${generatedNamePrefix}Expected${node.getStart()}`
          const inferred = `${generatedNamePrefix}Probe${node.getStart()}`

          const snippet =
            `\n{\nconst ${expected}${typeSource} = ${initializerSource};\n` +
            `const ${inferred} = ${modifiedInitializer};\n}\n`

          const hasContextualParameters = Array.isReadonlyArrayNonEmpty(parameterTypes)
          const hasOuterType = Option.isSome(outerType)

          const contextualDetails = hasContextualParameters
            ? Option.some(contextualFinding)
            : Option.none()

          const outerDetails = hasOuterType ? Option.some(constFinding) : Option.none()

          const finding = pipe(
            contextualDetails,
            Option.orElse(Function.constant(outerDetails)),
            Option.getOrElse(Function.constant(returnFinding))
          )

          const [message, hint] = finding

          return new InferenceProbe(node, variableStatement.end, snippet, message, hint)
        })
      )
    })
  )
}

const removableModifierKinds = Array.make(ts.SyntaxKind.ExportKeyword, ts.SyntaxKind.DefaultKeyword)

const removableModifier = (modifier: ts.Modifier) =>
  Array.contains(removableModifierKinds, modifier.kind)

const functionDeclarationProbe =
  (checker: ts.TypeChecker) => (declaration: ts.FunctionDeclaration) => {
    const name = Option.fromNullishOr(declaration.name)
    const body = Option.fromNullishOr(declaration.body)

    const returnType = pipe(
      Option.fromNullishOr(declaration.type),
      Option.filter(Predicate.not(ts.isTypePredicateNode))
    )

    const parts = Option.all({ name, body, returnType })

    return pipe(
      parts,
      Option.filter(({ name: identifier, body: functionBody }) => {
        const recursive = declarationRecurses(checker)(identifier, functionBody)
        const ambient = isInAmbientContext(declaration)
        const symbol = checker.getSymbolAtLocation(identifier)

        const symbolDeclarations = pipe(
          Option.fromNullishOr(symbol),
          Option.flatMap((current) => Option.fromNullishOr(current.declarations)),
          Option.map(Array.length),
          Option.getOrElse(Function.constant(1))
        )

        const unambiguous = symbolDeclarations === 1
        const eligibility = Array.make(!recursive, !ambient, unambiguous)

        return Array.every(eligibility, Boolean)
      }),
      Option.flatMap(({ name: identifier, returnType: typeNode }) => {
        const sourceFile = declaration.getSourceFile()
        const removal = annotationEdit(sourceFile, typeNode, declaration.parameters.end)

        return pipe(
          removal,
          Option.map((returnRemoval) => {
            const expected = `${generatedNamePrefix}Expected${typeNode.getStart()}`
            const inferred = `${generatedNamePrefix}Probe${typeNode.getStart()}`
            const modifiers = ts.getModifiers(declaration) ?? Array.empty()

            const modifierEdits = pipe(
              modifiers,
              Array.filter(removableModifier),
              Array.map((modifier) => {
                const start = modifier.getStart(sourceFile)

                return Tuple.make(start, modifier.end, "")
              })
            )

            const identifierStart = identifier.getStart(sourceFile)
            const expectedRename = Tuple.make(identifierStart, identifier.end, expected)
            const probeRename = Tuple.make(identifierStart, identifier.end, inferred)
            const declarationSource = declaration.getText(sourceFile)
            const offset = declaration.getStart(sourceFile)
            const expectedEdits = Array.append(modifierEdits, expectedRename)
            const expectedSource = applyEdits(declarationSource, offset, expectedEdits)

            const probeEdits = pipe(
              modifierEdits,
              Array.append(probeRename),
              Array.append(returnRemoval)
            )

            const probeSource = applyEdits(declarationSource, offset, probeEdits)
            const snippet = `\n{\n${expectedSource}\n${probeSource}\n}\n`

            return new InferenceProbe(
              typeNode,
              declaration.end,
              snippet,
              returnFinding[0],
              returnFinding[1]
            )
          })
        )
      })
    )
  }

const probesIn = (checker: ts.TypeChecker, sourceFile: ts.SourceFile) => {
  const sourceNodes = astNodesIn(sourceFile)
  const nodes = Array.fromIterable(sourceNodes)
  const variableProbeFrom = flow(variableProbe(checker), optionResult)
  const functionProbeFrom = flow(functionDeclarationProbe(checker), optionResult)

  const variableProbes = pipe(
    nodes,
    Array.filter(ts.isVariableDeclaration),
    Array.filterMap(variableProbeFrom)
  )

  const functionProbes = pipe(
    nodes,
    Array.filter(ts.isFunctionDeclaration),
    Array.filterMap(functionProbeFrom)
  )

  return Array.appendAll(variableProbes, functionProbes)
}

const insertionOrder: Order.Order<InferenceProbe> = Order.mapInput(
  Order.Number,
  Struct.get("insertionPosition")
)

const augmentSource = (sourceFile: ts.SourceFile, probes: ReadonlyArray<InferenceProbe>) => {
  const sorted = Array.sort(probes, insertionOrder)

  const [cursor, chunks] = Array.mapAccum(sorted, 0, (position, probe) => {
    const sourceChunk = sourceFile.text.slice(position, probe.insertionPosition)
    const chunk = sourceChunk + probe.snippet

    return Tuple.make(probe.insertionPosition, chunk)
  })

  const tail = sourceFile.text.slice(cursor)

  return pipe(chunks, Array.append(tail), Array.join(""))
}

const sourceAnalyses = (context: ProgramContext) =>
  pipe(
    context.program.getSourceFiles(),
    Array.filter((sourceFile) => !sourceFile.isDeclarationFile),
    Array.filter((sourceFile) => !context.program.isSourceFileFromExternalLibrary(sourceFile)),
    Array.filterMap((sourceFile) => {
      const probes = probesIn(context.checker, sourceFile)
      const analysisEntry = Tuple.make(sourceFile, probes)

      const analysis = Array.isReadonlyArrayNonEmpty(probes)
        ? Option.some(analysisEntry)
        : Option.none()

      return optionResult(analysis)
    }),
    Array.map(([sourceFile, probes]) => {
      const analysis = Tuple.make(sourceFile, probes)

      return Tuple.make(sourceFile.fileName, analysis)
    }),
    HashMap.fromIterable
  )

const shadowProgram = (
  context: ProgramContext,
  analyses: HashMap.HashMap<string, readonly [ts.SourceFile, ReadonlyArray<InferenceProbe>]>
) => {
  const programOptions = context.program.getCompilerOptions()
  const options = { ...programOptions, noUnusedLocals: false, noUnusedParameters: false }
  const baseHost = ts.createCompilerHost(options, true)

  const augmented = HashMap.map(analyses, ([sourceFile, probes]) =>
    augmentSource(sourceFile, probes)
  )

  const getSourceFile: ts.CompilerHost["getSourceFile"] = (
    fileName,
    languageVersion,
    onError,
    shouldCreateNewSourceFile
  ) => {
    const existingSourceFile = context.program.getSourceFile(fileName)

    return pipe(
      HashMap.get(augmented, fileName),
      Option.map((text) => ts.createSourceFile(fileName, text, languageVersion, true)),
      Option.getOrElse(() =>
        pipe(
          Option.fromNullishOr(existingSourceFile),
          Option.getOrElse(() =>
            baseHost.getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)
          )
        )
      )
    )
  }

  const host = { ...baseHost, getSourceFile } satisfies ts.CompilerHost
  const rootNames = context.program.getRootFileNames()
  const projectReferences = context.program.getProjectReferences()

  return ts.createProgram({
    rootNames,
    options,
    projectReferences,
    host,
    oldProgram: context.program
  })
}

const namedDeclarationEntry = (
  name: string,
  declaration: ts.VariableDeclaration | ts.FunctionDeclaration
) => Tuple.make(name, declaration)

const namedProbeDeclarations = (sourceFile: ts.SourceFile) =>
  pipe(
    astNodesIn(sourceFile),
    Iterable.filterMap((node) => {
      const variable = pipe(
        Option.liftPredicate(ts.isVariableDeclaration)(node),
        Option.flatMap((declaration) =>
          pipe(
            Option.liftPredicate(ts.isIdentifier)(declaration.name),
            Option.map((name) => namedDeclarationEntry(name.text, declaration))
          )
        )
      )

      const fn = pipe(
        Option.liftPredicate(ts.isFunctionDeclaration)(node),
        Option.flatMap((declaration) =>
          pipe(
            Option.fromNullishOr(declaration.name),
            Option.map((name) => namedDeclarationEntry(name.text, declaration))
          )
        )
      )

      const declaration = pipe(
        variable,
        Option.orElse(Function.constant(fn)),
        Option.filter((entry) => entry[0].startsWith(generatedNamePrefix))
      )

      return optionResult(declaration)
    }),
    HashMap.fromIterable
  )

const declarationName = (declaration: ts.VariableDeclaration | ts.FunctionDeclaration) =>
  ts.isVariableDeclaration(declaration)
    ? Option.liftPredicate(ts.isIdentifier)(declaration.name)
    : Option.fromNullishOr(declaration.name)

const nodeType = (
  checker: ts.TypeChecker,
  declaration: ts.VariableDeclaration | ts.FunctionDeclaration
) => {
  const getTypeAtLocation = checker.getTypeAtLocation.bind(checker)

  return pipe(declarationName(declaration), Option.map(getTypeAtLocation))
}

const sensitiveTypeFlags = ts.TypeFlags.Any | ts.TypeFlags.Never | ts.TypeFlags.Unknown

const sameSensitiveFlags = (left: ts.Type, right: ts.Type) =>
  (left.flags & sensitiveTypeFlags) === (right.flags & sensitiveTypeFlags)

const mutuallyAssignable = (checker: ts.TypeChecker, left: ts.Type, right: ts.Type) =>
  checker.isTypeAssignableTo(left, right) && checker.isTypeAssignableTo(right, left)

const signaturesEquivalent = (
  checker: ts.TypeChecker,
  leftNode: ts.Node,
  rightNode: ts.Node,
  left: ts.Signature,
  right: ts.Signature
) => {
  const leftParameters = left.getParameters()
  const rightParameters = right.getParameters()
  const parameterPairs = Array.zip(leftParameters, rightParameters)

  const parametersMatch = Array.every(parameterPairs, ([leftParameter, rightParameter]) => {
    const leftType = checker.getTypeOfSymbolAtLocation(leftParameter, leftNode)
    const rightType = checker.getTypeOfSymbolAtLocation(rightParameter, rightNode)
    const sameFlags = sameSensitiveFlags(leftType, rightType)
    const assignable = mutuallyAssignable(checker, leftType, rightType)
    const parameterFlags = Array.make(sameFlags, assignable)

    return Array.every(parameterFlags, Boolean)
  })

  const leftReturn = checker.getReturnTypeOfSignature(left)
  const rightReturn = checker.getReturnTypeOfSignature(right)
  const sameReturnFlags = sameSensitiveFlags(leftReturn, rightReturn)
  const assignableReturns = mutuallyAssignable(checker, leftReturn, rightReturn)
  const returnFlags = Array.make(sameReturnFlags, assignableReturns)
  const returnsMatch = Array.every(returnFlags, Boolean)

  const signatureFlags = Array.make(
    leftParameters.length === rightParameters.length,
    parametersMatch,
    returnsMatch
  )

  return Array.every(signatureFlags, Boolean)
}

const typeText = (checker: ts.TypeChecker, type: ts.Type, node: ts.Node) =>
  checker.typeToString(
    type,
    node,
    ts.TypeFormatFlags.NoTruncation |
      ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope |
      ts.TypeFormatFlags.WriteArrowStyleSignature
  )

const typesEquivalent = (
  checker: ts.TypeChecker,
  leftNode: ts.Node,
  rightNode: ts.Node,
  left: ts.Type,
  right: ts.Type
) => {
  const leftSignatures = left.getCallSignatures()
  const rightSignatures = right.getCallSignatures()
  const signaturePairs = Array.zip(leftSignatures, rightSignatures)

  const signaturesMatch = Array.every(signaturePairs, ([leftSignature, rightSignature]) =>
    signaturesEquivalent(checker, leftNode, rightNode, leftSignature, rightSignature)
  )

  const leftText = typeText(checker, left, leftNode)
  const rightText = typeText(checker, right, rightNode)
  const sameFlags = sameSensitiveFlags(left, right)
  const assignable = mutuallyAssignable(checker, left, right)
  const sameSignatureCount = leftSignatures.length === rightSignatures.length
  const sameText = leftText === rightText

  const equivalenceFlags = Array.make(
    sameFlags,
    assignable,
    sameSignatureCount,
    signaturesMatch,
    sameText
  )

  return Array.every(equivalenceFlags, Boolean)
}

const declarationInitializer = (declaration: ts.VariableDeclaration | ts.FunctionDeclaration) =>
  ts.isVariableDeclaration(declaration)
    ? Option.fromNullishOr(declaration.initializer)
    : Option.none()

const functionInitializersEquivalent = (
  checker: ts.TypeChecker,
  expected: ts.VariableDeclaration | ts.FunctionDeclaration,
  probe: ts.VariableDeclaration | ts.FunctionDeclaration
) => {
  const expectedFunctions = pipe(
    declarationInitializer(expected),
    Option.map(functionInitializersIn),
    Option.getOrElse(Array.empty)
  )

  const probeFunctions = pipe(
    declarationInitializer(probe),
    Option.map(functionInitializersIn),
    Option.getOrElse(Array.empty)
  )

  const functionPairs = Array.zip(expectedFunctions, probeFunctions)

  const functionsMatch = Array.every(functionPairs, ([expectedFunction, probeFunction]) => {
    const expectedType = checker.getTypeAtLocation(expectedFunction)
    const probeType = checker.getTypeAtLocation(probeFunction)

    return typesEquivalent(checker, expectedFunction, probeFunction, expectedType, probeType)
  })

  const equivalenceFlags = Array.make(
    expectedFunctions.length === probeFunctions.length,
    functionsMatch
  )

  return Array.every(equivalenceFlags, Boolean)
}

const candidateTypesEquivalent = (
  checker: ts.TypeChecker,
  declarations: HashMap.HashMap<string, ts.VariableDeclaration | ts.FunctionDeclaration>,
  candidate: InferenceProbe
) => {
  const expectedDeclarationName = expectedName(candidate)
  const probeDeclarationName = probeName(candidate)
  const expected = HashMap.get(declarations, expectedDeclarationName)
  const probe = HashMap.get(declarations, probeDeclarationName)
  const pair = Option.all({ expected, probe })

  return pipe(
    pair,
    Option.exists(({ expected: expectedDeclaration, probe: probeDeclaration }) => {
      const expectedType = nodeType(checker, expectedDeclaration)
      const probeType = nodeType(checker, probeDeclaration)
      const types = Option.all({ expectedType, probeType })

      const rootsMatch = pipe(
        types,
        Option.exists(({ expectedType: left, probeType: right }) =>
          typesEquivalent(checker, expectedDeclaration, probeDeclaration, left, right)
        )
      )

      const functionsMatch = functionInitializersEquivalent(
        checker,
        expectedDeclaration,
        probeDeclaration
      )

      const equivalenceFlags = Array.make(rootsMatch, functionsMatch)

      return Array.every(equivalenceFlags, Boolean)
    })
  )
}

const ancestorBlock = (node: ts.Node): Option.Option<ts.Block> => {
  const parent = Option.fromNullishOr(node.parent)
  const block = pipe(parent, Option.filter(ts.isBlock))
  const ancestor = pipe(parent, Option.flatMap(ancestorBlock))

  return pipe(block, Option.orElse(Function.constant(ancestor)))
}

const candidateHasDiagnostic = (
  diagnostics: ReadonlyArray<ts.Diagnostic>,
  declarations: HashMap.HashMap<string, ts.VariableDeclaration | ts.FunctionDeclaration>,
  candidate: InferenceProbe
) => {
  const declarationName = expectedName(candidate)
  const block = pipe(HashMap.get(declarations, declarationName), Option.flatMap(ancestorBlock))

  return pipe(
    block,
    Option.exists((candidateBlock) => {
      const blockStart = candidateBlock.getStart()

      return Array.some(diagnostics, (diagnostic) =>
        pipe(
          Option.fromNullishOr(diagnostic.start),
          Option.exists((start) => {
            const bounds = Array.make(start >= blockStart, start < candidateBlock.end)

            return Array.every(bounds, Boolean)
          })
        )
      )
    })
  )
}

const diagnosticsFor = (program: ts.Program, sourceFile: ts.SourceFile) => {
  const syntactic = program.getSyntacticDiagnostics(sourceFile)
  const semantic = program.getSemanticDiagnostics(sourceFile)

  return Array.appendAll(syntactic, semantic)
}

const findingsInSource = (
  context: ProgramContext,
  program: ts.Program,
  original: ts.SourceFile,
  probes: ReadonlyArray<InferenceProbe>
) => {
  const shadowSource = program.getSourceFile(original.fileName)
  const sourceFile = Option.fromNullishOr(shadowSource)
  const comments = sourceComments(original)
  const checkContext = new CheckContext({ ...context, sourceFile: original, comments })
  const match = detection(checkContext)

  return pipe(
    sourceFile,
    Option.map((source) => {
      const declarations = namedProbeDeclarations(source)
      const checker = program.getTypeChecker()

      const equivalent = Array.filter(probes, (candidate) =>
        candidateTypesEquivalent(checker, declarations, candidate)
      )

      if (Array.isReadonlyArrayEmpty(equivalent)) {
        return Array.empty<Detection>()
      }

      const diagnostics = diagnosticsFor(program, source)

      const findings = Array.filter(
        equivalent,
        Predicate.not((candidate) => candidateHasDiagnostic(diagnostics, declarations, candidate))
      )

      return Array.map(findings, (finding) =>
        match({
          node: finding.detectionNode,
          message: finding.message,
          hint: finding.hint
        })
      )
    }),
    Option.getOrElse(Array.empty)
  )
}

const buildFindingIndex = (context: ProgramContext) => {
  const analyses = sourceAnalyses(context)

  if (HashMap.isEmpty(analyses)) {
    return HashMap.empty<string, ReadonlyArray<Detection>>()
  }

  const program = shadowProgram(context, analyses)

  const entries = pipe(
    analyses,
    HashMap.values,
    Iterable.map(([sourceFile, probes]) => {
      const findings = findingsInSource(context, program, sourceFile, probes)

      return Tuple.make(sourceFile.fileName, findings)
    })
  )

  return HashMap.fromIterable(entries)
}

// The cache retains one Program because workspace analysis is sequential.
const emptyFindingIndexCache =
  Option.none<readonly [ts.Program, HashMap.HashMap<string, ReadonlyArray<Detection>>]>()

const findingIndexCache = MutableRef.make(emptyFindingIndexCache)

const findingIndex = (context: ProgramContext) => {
  const cached = MutableRef.get(findingIndexCache)

  const current = pipe(
    cached,
    Option.filter(([program]) => program === context.program)
  )

  if (Option.isSome(current)) {
    return current.value[1]
  }

  const findings = buildFindingIndex(context)
  const cacheEntry = Tuple.make(context.program, findings)
  const updated = Option.some(cacheEntry)

  MutableRef.set(findingIndexCache, updated)

  return findings
}

const findingSubscriptions = (index: HashMap.HashMap<string, ReadonlyArray<Detection>>) => {
  const matches = (context: CheckContext) =>
    pipe(HashMap.get(index, context.sourceFile.fileName), Option.getOrElse(Array.empty))

  return fileSubscriptions(matches)
}

export const inferredTypePlan = withProgramIndex(findingIndex)(findingSubscriptions).plan
