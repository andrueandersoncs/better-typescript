import {
  Array,
  Function,
  HashMap,
  Iterable,
  MutableRef,
  Option,
  Order,
  Predicate,
  Struct,
  Tuple,
  flow,
  pipe
} from "effect"
import * as ts from "typescript"
import { astNodesIn } from "../sources/astNodesIn.js"
import type { ProgramMatchContext } from "../matcher/programMatchContext.js"
import { isInAmbientContext } from "../support/isDeclareKeyword.js"
import { isFunctionInitializer } from "../support/isFunctionInitializer.js"
import type { FunctionInitializer } from "../support/functionInitializer.js"
import { strictEqual } from "../equivalence.js"
import { fileSubscriptions } from "../matcher/fileSubscriptions.js"
import { makeMatcherFromSubscriptions } from "../matcher/makeMatcherFromSubscriptions.js"
import { makeNodeMatch } from "../matcher/makeNodeMatch.js"
import type { Match } from "../matcher/match.js"
import type { MatchContext } from "../matcher/matchContext.js"
import { annotationEdit } from "./annotationEdit.js"
import { applyEdits } from "./applyEdits.js"
import { expectedName } from "./expectedName.js"
import { declarationRecurses } from "./functionBodyRecursion.js"
import { functionInitializersIn } from "./functionInitializersIn.js"
import { generatedNamePrefix } from "./generatedNamePrefix.js"
import { InferenceProbe } from "./inferenceProbe.js"
import { optionResult } from "./optionResult.js"
import { PreferInferredTypesFact } from "./preferInferredTypesFact.js"
import type { PreferInferredTypesKind } from "./preferInferredTypesKind.js"
import { returnFinding } from "./returnFinding.js"
import { typesEquivalent } from "./typesEquivalent.js"

const emptyFunctionInitializers = Array.empty<FunctionInitializer>()

const constFinding: PreferInferredTypesKind = "const"
const contextualFinding: PreferInferredTypesKind = "contextual"

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
          const parameterAnnotationEdit = (typeNode: ts.TypeNode) => {
            const fromParameter = (parameter: ts.ParameterDeclaration) =>
              annotationEdit(sourceFile, typeNode, parameter.name.end)

            return pipe(
              Option.liftPredicate(ts.isParameter)(typeNode.parent),
              Option.flatMap(fromParameter)
            )
          }

          const returnAnnotationEdit = (typeNode: ts.TypeNode) => {
            const fromFunction = (fn: FunctionInitializer) =>
              annotationEdit(sourceFile, typeNode, fn.parameters.end)

            return pipe(
              Option.liftPredicate(isFunctionInitializer)(typeNode.parent),
              Option.flatMap(fromFunction)
            )
          }

          const parameterEdits = pipe(
            parameterTypes,
            Array.filterMap(flow(parameterAnnotationEdit, optionResult))
          )

          const returnEdits = pipe(
            returnTypes,
            Array.filterMap(flow(returnAnnotationEdit, optionResult))
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
          const outerDetails = hasOuterType ? Option.some(constFinding) : Option.none()

          const contextualDetails = hasContextualParameters
            ? Option.some(contextualFinding)
            : Option.none()

          const kind = pipe(
            contextualDetails,
            Option.orElse(Function.constant(outerDetails)),
            Option.getOrElse(Function.constant(returnFinding))
          )

          return new InferenceProbe(node, variableStatement.end, snippet, kind)
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
        const declarationsOf = (current: ts.Symbol) => Option.fromNullishOr(current.declarations)

        const symbolDeclarationCount = pipe(
          Option.fromNullishOr(symbol),
          Option.flatMap(declarationsOf),
          Option.map(Array.length),
          Option.getOrElse(Function.constant(1))
        )

        const unambiguous = strictEqual(1)(symbolDeclarationCount)
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
            return new InferenceProbe(typeNode, declaration.end, snippet, returnFinding)
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

const sourceAnalyses = (context: ProgramMatchContext) => {
  const isImplementationSourceFile = (sourceFile: ts.SourceFile) => !sourceFile.isDeclarationFile

  const sourceFileAnalysis = (sourceFile: ts.SourceFile) => {
    const probes = probesIn(context.checker, sourceFile)
    const analysisEntry = Tuple.make(sourceFile, probes)

    const analysis = Array.isReadonlyArrayNonEmpty(probes)
      ? Option.some(analysisEntry)
      : Option.none()

    return optionResult(analysis)
  }

  const analysisByFileName = ([sourceFile, probes]: readonly [
    ts.SourceFile,
    ReadonlyArray<InferenceProbe>
  ]) => {
    const analysis = Tuple.make(sourceFile, probes)

    return Tuple.make(sourceFile.fileName, analysis)
  }

  return pipe(
    context.sourceFiles,
    Array.filter(isImplementationSourceFile),
    Array.filterMap(sourceFileAnalysis),
    Array.map(analysisByFileName),
    HashMap.fromIterable
  )
}

const makeShadowProgram = (
  context: ProgramMatchContext,
  analyses: HashMap.HashMap<string, readonly [ts.SourceFile, ReadonlyArray<InferenceProbe>]>
) => {
  const programOptions = context.program.getCompilerOptions()

  const options = Object.assign({}, programOptions, {
    noUnusedLocals: false,
    noUnusedParameters: false
  })

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

    const createSourceFileFromText = (text: string) =>
      ts.createSourceFile(fileName, text, languageVersion, true)

    return pipe(
      HashMap.get(augmented, fileName),
      Option.map(createSourceFileFromText),
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

  const host = Object.assign({}, baseHost, { getSourceFile }) satisfies ts.CompilerHost
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

const namedProbeDeclarations = (sourceFile: ts.SourceFile) => {
  const variableNamedEntry = (declaration: ts.VariableDeclaration) => {
    const entryFromName = (name: ts.Identifier) => namedDeclarationEntry(name.text, declaration)

    return pipe(Option.liftPredicate(ts.isIdentifier)(declaration.name), Option.map(entryFromName))
  }

  const functionNamedEntry = (declaration: ts.FunctionDeclaration) => {
    const entryFromName = (name: ts.Identifier) => namedDeclarationEntry(name.text, declaration)

    return pipe(Option.fromNullishOr(declaration.name), Option.map(entryFromName))
  }

  const nodeNamedEntry = (node: ts.Node) => {
    const variable = pipe(
      Option.liftPredicate(ts.isVariableDeclaration)(node),
      Option.flatMap(variableNamedEntry)
    )

    const fn = pipe(
      Option.liftPredicate(ts.isFunctionDeclaration)(node),
      Option.flatMap(functionNamedEntry)
    )

    const declaration = pipe(
      variable,
      Option.orElse(Function.constant(fn)),
      Option.filter((entry) => {
        const generatedName = Tuple.get(entry, 0)

        return generatedName.startsWith(generatedNamePrefix)
      })
    )

    return optionResult(declaration)
  }

  return pipe(astNodesIn(sourceFile), Iterable.filterMap(nodeNamedEntry), HashMap.fromIterable)
}

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

  const sameFunctionCount = strictEqual(probeFunctions.length)(expectedFunctions.length)
  const equivalenceFlags = Array.make(sameFunctionCount, functionsMatch)

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

  const blockHasDiagnostic = (candidateBlock: ts.Block) => {
    const blockStart = candidateBlock.getStart()

    const diagnosticInBlock = (diagnostic: ts.Diagnostic) => {
      const startInBlock = (start: number) => {
        const bounds = Array.make(start >= blockStart, start < candidateBlock.end)

        return Array.every(bounds, Boolean)
      }

      return pipe(Option.fromNullishOr(diagnostic.start), Option.exists(startInBlock))
    }

    return Array.some(diagnostics, diagnosticInBlock)
  }

  return pipe(block, Option.exists(blockHasDiagnostic))
}

const diagnosticsFor = (program: ts.Program, sourceFile: ts.SourceFile) => {
  const syntactic = program.getSyntacticDiagnostics(sourceFile)
  const semantic = program.getSemanticDiagnostics(sourceFile)

  return Array.appendAll(syntactic, semantic)
}

const matchesInSource = (
  program: ts.Program,
  original: ts.SourceFile,
  probes: ReadonlyArray<InferenceProbe>
): ReadonlyArray<Match<PreferInferredTypesFact>> => {
  const shadowSource = program.getSourceFile(original.fileName)
  const sourceFile = Option.fromNullishOr(shadowSource)
  return pipe(
    sourceFile,
    Option.map((source) => {
      const declarations = namedProbeDeclarations(source)
      const checker = program.getTypeChecker()

      const candidateIsEquivalent = (candidate: InferenceProbe) =>
        candidateTypesEquivalent(checker, declarations, candidate)

      const equivalent = Array.filter(probes, candidateIsEquivalent)

      if (Array.isReadonlyArrayEmpty(equivalent)) {
        return Array.empty<Match<PreferInferredTypesFact>>()
      }

      const diagnostics = diagnosticsFor(program, source)

      const candidateIsDiagnosticFree = (candidate: InferenceProbe) =>
        !candidateHasDiagnostic(diagnostics, declarations, candidate)

      const findings = Array.filter(equivalent, candidateIsDiagnosticFree)

      const matchFinding = (finding: InferenceProbe) => {
        const fact = PreferInferredTypesFact.make({ kind: finding.kind })

        return makeNodeMatch(finding.detectionNode, fact)
      }

      return Array.map(findings, matchFinding)
    }),
    Option.getOrElse(Array.empty)
  )
}

const buildMatchIndex = (context: ProgramMatchContext) => {
  const analyses = sourceAnalyses(context)

  if (HashMap.isEmpty(analyses)) {
    return HashMap.empty<string, ReadonlyArray<Match<PreferInferredTypesFact>>>()
  }

  const program = makeShadowProgram(context, analyses)

  const entries = pipe(
    analyses,
    HashMap.values,
    Iterable.map(([sourceFile, probes]) => {
      const matches = matchesInSource(program, sourceFile, probes)

      return Tuple.make(sourceFile.fileName, matches)
    })
  )

  return HashMap.fromIterable(entries)
}

// The cache retains one scoped Program because workspace analysis is sequential.
const emptyMatchIndexCache =
  Option.none<
    readonly [
      ts.Program,
      ReadonlyArray<ts.SourceFile>,
      HashMap.HashMap<string, ReadonlyArray<Match<PreferInferredTypesFact>>>
    ]
  >()

const matchIndexCache = MutableRef.make(emptyMatchIndexCache)

const sourceFileScopesMatch = (
  left: ReadonlyArray<ts.SourceFile>,
  right: ReadonlyArray<ts.SourceFile>
) => {
  const sameLength = strictEqual(left.length)(right.length)

  const sameSourceAt = (sourceFile: ts.SourceFile, index: number) =>
    pipe(Array.get(right, index), Option.exists(strictEqual(sourceFile)))

  return sameLength && Array.every(left, sameSourceAt)
}

const matchesByFile = (context: ProgramMatchContext) => {
  const cached = MutableRef.get(matchIndexCache)

  const cacheMatches = (
    entry: readonly [
      ts.Program,
      ReadonlyArray<ts.SourceFile>,
      HashMap.HashMap<string, ReadonlyArray<Match<PreferInferredTypesFact>>>
    ]
  ) => {
    const program = Tuple.get(entry, 0)
    const sourceFiles = Tuple.get(entry, 1)
    const sameProgram = strictEqual(context.program)(program)
    const sameScope = sourceFileScopesMatch(context.sourceFiles, sourceFiles)

    return sameProgram && sameScope
  }

  const current = pipe(cached, Option.filter(cacheMatches))

  if (Option.isSome(current)) {
    return Tuple.get(current.value, 2)
  }

  const matches = buildMatchIndex(context)
  const cacheEntry = Tuple.make(context.program, context.sourceFiles, matches)
  const updated = Option.some(cacheEntry)

  MutableRef.set(matchIndexCache, updated)

  return matches
}

const matchesForSourceFile =
  (index: HashMap.HashMap<string, ReadonlyArray<Match<PreferInferredTypesFact>>>) =>
  (matchContext: MatchContext) =>
    pipe(HashMap.get(index, matchContext.sourceFile.fileName), Option.getOrElse(Array.empty))

const preferInferredTypesPlan = flow(matchesByFile, matchesForSourceFile, fileSubscriptions)

export const preferInferredTypesMatcher = makeMatcherFromSubscriptions(preferInferredTypesPlan)
