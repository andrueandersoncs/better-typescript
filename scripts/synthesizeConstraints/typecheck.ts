import * as fs from "node:fs"
import * as path from "node:path"
import {
  Array,
  Data,
  Effect,
  Equivalence,
  Function,
  HashMap,
  Match,
  MutableList,
  Option,
  Predicate,
  Result,
  Schema,
  Struct,
  Tuple,
  flow,
  pipe
} from "effect"
import * as ts from "typescript"
import { CodeFence, Finding, ScratchDirectoryError, type FenceLanguage } from "./data.ts"

const equals =
  <A>(left: A) =>
  <B>(right: B) =>
    Equivalence.strictEqual<A | B>()(left, right)

const es2022Lib = Array.make("lib.es2022.d.ts")
const nodeTypes = Array.make("node")

// compilerOptions mirrors the repo because a fence must pass here only when paste-ready.
const compilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  lib: es2022Lib,
  types: nodeTypes,
  strict: true,
  esModuleInterop: true,
  resolveJsonModule: true,
  allowArbitraryExtensions: true,
  forceConsistentCasingInFileNames: true,
  skipLibCheck: true,
  noEmit: true
} satisfies ts.CompilerOptions

const packageManifest = { name: "constraint-fences", private: true, type: "module" }
const packageJsonBody = JSON.stringify(packageManifest, null, 2)
const packageJsonContents = `${packageJsonBody}\n`

const tsLanguageEntry = Tuple.make("ts" as FenceLanguage, true)
const tsxLanguageEntry = Tuple.make("tsx" as FenceLanguage, true)
const scriptLanguages = HashMap.make(tsLanguageEntry, tsxLanguageEntry)

const scriptFence = (fence: CodeFence) => HashMap.has(scriptLanguages, fence.language)

const dataFence = flow(scriptFence, (isScript) => !isScript)

const directoryFor = (fence: CodeFence) => fence.id.replace(/[^\p{L}\p{N}]+/gu, "_")

const moduleSuffix = "\n\nexport {}\n"

const asModule = (parsed: ts.SourceFile) => (code: string) =>
  ts.isExternalModule(parsed) ? code : `${code}${moduleSuffix}`

const emptyNames: ReadonlyArray<string> = Array.empty()
const stringArray = Schema.Array(Schema.String)

// Bindings is the resolved import surface because neighbour stubs need names, default, and dynamic.
const Bindings = Schema.Struct({
  named: stringArray,
  hasDefault: Schema.Boolean,
  dynamic: Schema.Boolean
})

// Bindings is the merged specifier surface because declarationsFor and merge both read it.
interface Bindings extends Schema.Schema.Type<typeof Bindings> {}

const emptyBindings = Bindings.make({
  named: emptyNames,
  hasDefault: false,
  dynamic: false
})

const noBindings = Function.constant(emptyBindings)

const startsWithDotSlash = (specifier: string) => specifier.startsWith("./")
const startsWithDotDotSlash = (specifier: string) => specifier.startsWith("../")

const isRelative = (specifier: string) => {
  const fromHere = startsWithDotSlash(specifier)
  const fromParent = startsWithDotDotSlash(specifier)
  const relativePrefixes = Array.make(fromHere, fromParent)
  return Array.some(relativePrefixes, Boolean)
}

const hasMessageProperty = Predicate.hasProperty("message")

const messageFromCause = (cause: unknown) =>
  pipe(
    cause,
    Option.liftPredicate(hasMessageProperty),
    Option.map(Struct.get("message")),
    Option.filter(Predicate.isString),
    Option.getOrElse(Function.constant("unknown failure"))
  )

const makeScratchDirectoryError = (cause: unknown) => {
  const message = messageFromCause(cause)
  return new ScratchDirectoryError({ message })
}

const importElementName = (element: ts.ImportSpecifier) => {
  const property = Option.fromNullishOr(element.propertyName)
  const name = Option.getOrElse(property, Function.constant(element.name))
  return name.text
}

const exportElementName = (element: ts.ExportSpecifier) => {
  const property = Option.fromNullishOr(element.propertyName)
  const name = Option.getOrElse(property, Function.constant(element.name))
  return name.text
}

const isDefaultName = equals("default")

const namedImportNames = (bindings: ts.NamedImports) =>
  Array.map(bindings.elements, importElementName)

const nonDefaultName = (name: string) => {
  const isDefault = isDefaultName(name)
  return !isDefault
}

const namedExportParts = (clause: ts.NamedExports) => {
  const names = Array.map(clause.elements, exportElementName)
  const hasDefault = Array.some(names, isDefaultName)
  const named = Array.filter(names, nonDefaultName)
  return Tuple.make(named, hasDefault)
}

const emptyNamedDefault = Tuple.make(emptyNames, false)

const makeStaticBindings = (named: ReadonlyArray<string>, hasDefault: boolean) =>
  Bindings.make({ named, hasDefault, dynamic: false })

const makeDynamicBindings = Bindings.make({
  named: emptyNames,
  hasDefault: false,
  dynamic: true
})

const bindingPair =
  (specifier: string) =>
  (binding: Bindings): readonly [string, Bindings] =>
    Tuple.make(specifier, binding)

const clauseDefaultName = (clause: ts.ImportClause) => Option.fromNullishOr(clause.name)
const clauseNamedBinding = (clause: ts.ImportClause) => Option.fromNullishOr(clause.namedBindings)

const dynamicPairFromLiteral = (literal: ts.StringLiteral) =>
  bindingPair(literal.text)(makeDynamicBindings)

const bindingFromImport = (node: ts.ImportDeclaration) =>
  pipe(
    node.moduleSpecifier,
    Option.liftPredicate(ts.isStringLiteral),
    Option.map((literal) => {
      const clause = Option.fromNullishOr(node.importClause)
      const hasDefault = pipe(clause, Option.flatMap(clauseDefaultName), Option.isSome)

      const named = pipe(
        clause,
        Option.flatMap(clauseNamedBinding),
        Option.filter(ts.isNamedImports),
        Option.map(namedImportNames),
        Option.getOrElse(Function.constant(emptyNames))
      )

      const binding = makeStaticBindings(named, hasDefault)
      return bindingPair(literal.text)(binding)
    })
  )

const exportClauseParts = (clause: ts.NamedExports | ts.NamespaceExport) =>
  pipe(
    Option.some(clause),
    Option.filter(ts.isNamedExports),
    Option.map(namedExportParts),
    Option.getOrElse(Function.constant(emptyNamedDefault))
  )

const bindingFromExport = (node: ts.ExportDeclaration) =>
  pipe(
    Option.fromNullishOr(node.moduleSpecifier),
    Option.filter(ts.isStringLiteral),
    Option.map((literal) => {
      const clause = Option.fromNullishOr(node.exportClause)

      const parts = pipe(
        clause,
        Option.map(exportClauseParts),
        Option.getOrElse(Function.constant(emptyNamedDefault))
      )

      const named = Tuple.get(parts, 0)
      const hasDefault = Tuple.get(parts, 1)
      const binding = makeStaticBindings(named, hasDefault)
      return bindingPair(literal.text)(binding)
    })
  )

const bindingFromImportEquals = (node: ts.ImportEqualsDeclaration) => {
  const moduleReference = node.moduleReference
  const isExternal = ts.isExternalModuleReference(moduleReference)

  if (!isExternal) {
    return Option.none<readonly [string, Bindings]>()
  }

  return pipe(
    moduleReference.expression,
    Option.liftPredicate(ts.isStringLiteral),
    Option.map(dynamicPairFromLiteral)
  )
}

const bindingFromDynamicImport = (node: ts.CallExpression) => {
  const isImportCall = equals(ts.SyntaxKind.ImportKeyword)(node.expression.kind)
  const args = Array.fromIterable(node.arguments)
  const firstArg = Array.get(args, 0)
  const none = Option.none<readonly [string, Bindings]>()

  const fromArg = pipe(
    firstArg,
    Option.filter(ts.isStringLiteral),
    Option.map(dynamicPairFromLiteral)
  )

  return isImportCall ? fromArg : none
}

const emptyBindingPairs: ReadonlyArray<readonly [string, Bindings]> = Array.empty()
const noBindingPairs = Function.constant(emptyBindingPairs)

const importBindingPairs = flow(bindingFromImport, Option.toArray)
const exportBindingPairs = flow(bindingFromExport, Option.toArray)
const importEqualsBindingPairs = flow(bindingFromImportEquals, Option.toArray)
const dynamicImportBindingPairs = flow(bindingFromDynamicImport, Option.toArray)

const bindingPairsAt = (node: ts.Node) =>
  pipe(
    Match.value(node),
    Match.when(ts.isImportDeclaration, importBindingPairs),
    Match.when(ts.isExportDeclaration, exportBindingPairs),
    Match.when(ts.isImportEqualsDeclaration, importEqualsBindingPairs),
    Match.when(ts.isCallExpression, dynamicImportBindingPairs),
    Match.orElse(noBindingPairs)
  )

const astChildren = (node: ts.Node) => {
  const children = MutableList.make<ts.Node>()

  ts.forEachChild(node, (child) => {
    MutableList.append(children, child)
    return false
  })

  return MutableList.toArray(children)
}

const bindingPairsInNode = (node: ts.Node): ReadonlyArray<readonly [string, Bindings]> => {
  const own = bindingPairsAt(node)
  const childNodes = astChildren(node)
  const nested = Array.flatMap(childNodes, bindingPairsInNode)
  return Array.appendAll(own, nested)
}

const mergeBindings = (left: Bindings) => (right: Bindings) => {
  const mergedNames = Array.appendAll(left.named, right.named)
  const named = Array.dedupe(mergedNames)
  const hasDefault = left.hasDefault || right.hasDefault
  const dynamic = left.dynamic || right.dynamic
  return Bindings.make({ named, hasDefault, dynamic })
}

const addBindingPair =
  (map: HashMap.HashMap<string, Bindings>) => (pair: readonly [string, Bindings]) => {
    const specifier = Tuple.get(pair, 0)
    const binding = Tuple.get(pair, 1)
    const prior = pipe(map, HashMap.get(specifier), Option.getOrElse(noBindings))
    const merged = mergeBindings(prior)(binding)
    return HashMap.set(map, specifier, merged)
  }

const emptyBindingMap = HashMap.empty<string, Bindings>()

const reduceBindingPair = (
  map: HashMap.HashMap<string, Bindings>,
  pair: readonly [string, Bindings]
) => addBindingPair(map)(pair)

const specifierBindings = (parsed: ts.SourceFile) => {
  const pairs = bindingPairsInNode(parsed)
  return Array.reduce(pairs, emptyBindingMap, reduceBindingPair)
}

const interfaceLine = (indent: string) => (name: string) =>
  `${indent}export interface ${name} { readonly [key: string]: unknown }`

const constLine = (indent: string) => (name: string) => `${indent}export declare const ${name}: any`

const declarationLinesForName = (indent: string) => (name: string) => {
  const iface = interfaceLine(indent)(name)
  const value = constLine(indent)(name)
  return Array.make(iface, value)
}

const declarationsFor = (indent: string) => (binding: Bindings) => {
  const namedLines = Array.flatMap(binding.named, declarationLinesForName(indent))
  const needsDefault = binding.hasDefault || binding.dynamic

  if (!needsDefault) {
    return namedLines
  }

  const fallbackDeclare = `${indent}declare const fallback: any`
  const fallbackExport = `${indent}export default fallback`
  const fallbackLines = Array.make(fallbackDeclare, fallbackExport)
  return Array.appendAll(namedLines, fallbackLines)
}

const emptyExtensionName = (specifier: string) => () => `${specifier}.ts`
const jsName = (specifier: string) => () => `${specifier.slice(0, -3)}.ts`
const mjsName = (specifier: string) => () => `${specifier.slice(0, -4)}.mts`
const cjsName = (specifier: string) => () => `${specifier.slice(0, -4)}.cts`
const jsxName = (specifier: string) => () => `${specifier.slice(0, -4)}.tsx`
const unchangedName = (specifier: string) => () => specifier

const declarationExtensionName = (specifier: string) => (extension: string) => {
  const stem = specifier.slice(0, -extension.length)
  return `${stem}.d${extension}.ts`
}

const fileNameForExtension = (specifier: string) => (extension: string) =>
  pipe(
    Match.value(extension),
    Match.when("", emptyExtensionName(specifier)),
    Match.when(".js", jsName(specifier)),
    Match.when(".mjs", mjsName(specifier)),
    Match.when(".cjs", cjsName(specifier)),
    Match.when(".jsx", jsxName(specifier)),
    Match.when(".ts", unchangedName(specifier)),
    Match.when(".tsx", unchangedName(specifier)),
    Match.when(".mts", unchangedName(specifier)),
    Match.when(".cts", unchangedName(specifier)),
    Match.orElse(declarationExtensionName(specifier))
  )

const posixExtension = path.posix.extname

const neighbourFileName = (specifier: string) =>
  pipe(specifier, posixExtension, fileNameForExtension(specifier))

const isJsonSpecifier = (specifier: string) => specifier.endsWith(".json")

const relativeNeighbour = (pair: readonly [string, Bindings]) => {
  const specifier = Tuple.get(pair, 0)
  const binding = Tuple.get(pair, 1)

  if (isJsonSpecifier(specifier)) {
    return Tuple.make(specifier, "{}\n")
  }

  const fileName = neighbourFileName(specifier)
  const declarationLines = declarationsFor("")(binding)
  const lines = Array.append(declarationLines, "export {}")
  const joined = Array.join(lines, "\n")
  const contents = `${joined}\n`
  return Tuple.make(fileName, contents)
}

const ambientModule = (pair: readonly [string, Bindings]) => {
  const specifier = Tuple.get(pair, 0)
  const binding = Tuple.get(pair, 1)
  const body = declarationsFor("  ")(binding)
  const quoted = JSON.stringify(specifier)
  const header = `declare module ${quoted} {`
  const withHeader = Array.prepend(body, header)
  const lines = Array.append(withHeader, "}")
  return Array.join(lines, "\n")
}

const isUnresolvedBare = (entry: string) => (pair: readonly [string, Bindings]) => {
  const specifier = Tuple.get(pair, 0)
  const relative = isRelative(specifier)
  const resolved = ts.resolveModuleName(specifier, entry, compilerOptions, ts.sys)
  const moduleOption = Option.fromNullishOr(resolved.resolvedModule)
  const unresolved = Option.isNone(moduleOption)
  const absolute = !relative
  const conditions = Array.make(absolute, unresolved)
  return Array.every(conditions, Boolean)
}

const pairSpecifier = (pair: readonly [string, Bindings]) => Tuple.get(pair, 0)

const isRelativePair = flow(pairSpecifier, isRelative)

const emptyNeighbourMap = HashMap.empty<string, string>()

const ambientMapFromBlocks = (blocks: ReadonlyArray<string>) => {
  const empty = equals(0)(blocks.length)

  if (empty) {
    return emptyNeighbourMap
  }

  const joined = Array.join(blocks, "\n\n")
  const contents = `${joined}\n`
  const ambientEntry = Tuple.make("ambient.d.ts", contents)
  return HashMap.make(ambientEntry)
}

const hashMapEntries = flow(HashMap.toEntries, Array.fromIterable)

const neighbourFiles = (entry: string) => (parsed: ts.SourceFile) => {
  const bindingsMap = specifierBindings(parsed)
  const entries = hashMapEntries(bindingsMap)
  const relativePairs = Array.filter(entries, isRelativePair)
  const relativeEntries = Array.map(relativePairs, relativeNeighbour)
  const unresolvedBare = Array.filter(entries, isUnresolvedBare(entry))
  const ambientBlocks = Array.map(unresolvedBare, ambientModule)
  const ambientMap = ambientMapFromBlocks(ambientBlocks)
  const relativeMap = HashMap.fromIterable(relativeEntries)
  return HashMap.union(relativeMap, ambientMap)
}

const jsonWithoutComments = (code: string) =>
  code
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/(^|[^:"'\\])\/\/[^\n]*/gu, "$1")
    .replace(/,(\s*[}\]])/gu, "$1")

const parseJsonSource = (source: string) =>
  Result.try({
    try: () => JSON.parse(source) as unknown,
    catch: Function.identity
  })

const isJsoncLanguage = equals("jsonc" as FenceLanguage)

const fenceUnit = (fence: CodeFence) => `${fence.kind}/${fence.index}`

const emptyFindings: ReadonlyArray<Finding> = Array.empty()
const noFindings = Function.constant(emptyFindings)

const makeParseFinding = (fence: CodeFence) => (cause: unknown) => {
  const detail = messageFromCause(cause)
  const unit = fenceUnit(fence)
  const message = `${fence.field} line 1: ${fence.language} fence does not parse: ${detail}`
  return Finding.make({
    code: "T1",
    unit,
    heading: fence.heading,
    message
  })
}

const findingsFromParseFailure = (fence: CodeFence) => flow(makeParseFinding(fence), Array.of)

const dataFindings = (fence: CodeFence) => {
  const source = isJsoncLanguage(fence.language) ? jsonWithoutComments(fence.code) : fence.code
  const parsed = parseJsonSource(source)

  return Result.match(parsed, {
    onSuccess: noFindings,
    onFailure: findingsFromParseFailure(fence)
  })
}

// FenceMaterials pairs program roots with ownership because diagnostics need both together.
class FenceMaterials extends Data.Class<{
  readonly roots: ReadonlyArray<string>
  readonly ownership: HashMap.HashMap<string, CodeFence>
}> {}

const emptyRoots: ReadonlyArray<string> = Array.empty()
const emptyOwnership = HashMap.empty<string, CodeFence>()

const emptyMaterials = new FenceMaterials({
  roots: emptyRoots,
  ownership: emptyOwnership
})

const makeMaterials = (left: FenceMaterials) => (right: FenceMaterials) => {
  const roots = Array.appendAll(left.roots, right.roots)
  const ownership = HashMap.union(left.ownership, right.ownership)
  return new FenceMaterials({ roots, ownership })
}

const ensureParentDirectory = (target: string) => {
  const parent = path.dirname(target)
  fs.mkdirSync(parent, { recursive: true })
  return target
}

const putFileContents = (target: string) => (contents: string) => {
  fs.writeFileSync(target, contents, "utf8")
  return target
}

const materialiseNeighbourFile = (directory: string) => (pair: readonly [string, string]) => {
  const fileName = Tuple.get(pair, 0)
  const contents = Tuple.get(pair, 1)
  const target = path.join(directory, fileName)
  const prepared = ensureParentDirectory(target)
  return putFileContents(prepared)(contents)
}

const ownershipEntry =
  (directory: string) => (fence: CodeFence) => (pair: readonly [string, string]) => {
    const fileName = Tuple.get(pair, 0)
    const joined = path.join(directory, fileName)
    const target = path.normalize(joined)
    return Tuple.make(target, fence)
  }

const makeScriptFenceMaterials = (scratchDirectory: string) => (fence: CodeFence) => {
  const directoryName = directoryFor(fence)
  const directory = path.join(scratchDirectory, directoryName)
  const entry = path.join(directory, `main.${fence.language}`)
  const parsed = ts.createSourceFile(entry, fence.code, ts.ScriptTarget.ES2022, true)
  const sourceText = asModule(parsed)(fence.code)
  fs.mkdirSync(directory, { recursive: true })
  fs.writeFileSync(entry, sourceText, "utf8")

  const neighbours = neighbourFiles(entry)(parsed)
  const neighbourEntries = hashMapEntries(neighbours)
  Array.map(neighbourEntries, materialiseNeighbourFile(directory))

  const normalizedEntry = path.normalize(entry)
  const entryOwnershipPair = Tuple.make(normalizedEntry, fence)
  const entryOwnership = HashMap.make(entryOwnershipPair)
  const neighbourOwnershipPairs = Array.map(neighbourEntries, ownershipEntry(directory)(fence))
  const neighbourOwnership = HashMap.fromIterable(neighbourOwnershipPairs)
  const ownership = HashMap.union(entryOwnership, neighbourOwnership)
  const hasAmbient = HashMap.has(neighbours, "ambient.d.ts")
  const ambientPath = path.join(directory, "ambient.d.ts")
  const roots = hasAmbient ? Array.make(entry, ambientPath) : Array.of(entry)

  return new FenceMaterials({ roots, ownership })
}

const prepareScratch = (scratchDirectory: string) =>
  Effect.try({
    try: () => {
      fs.rmSync(scratchDirectory, { recursive: true, force: true })
      fs.mkdirSync(scratchDirectory, { recursive: true })
      const packagePath = path.join(scratchDirectory, "package.json")
      fs.writeFileSync(packagePath, packageJsonContents, "utf8")
      return scratchDirectory
    },
    catch: makeScratchDirectoryError
  })

const makeFenceMaterialsEffect = (scratchDirectory: string) =>
  Effect.fn("Typecheck.makeFenceMaterials")(function* (fence: CodeFence) {
    return yield* Effect.try({
      try: () => makeScriptFenceMaterials(scratchDirectory)(fence),
      catch: makeScratchDirectoryError
    })
  })

const makeHarnessFinding = (code: number) => (flattened: string) =>
  Finding.make({
    code: "T1",
    unit: "document",
    heading: "<scratch program>",
    message: `compilerOptions line 1: TS${code}: ${flattened}`
  })

const makeOwnedFinding =
  (fence: CodeFence) => (line: number) => (code: number) => (flattened: string) => {
    const unit = fenceUnit(fence)
    return Finding.make({
      code: "T1",
      unit,
      heading: fence.heading,
      message: `${fence.field} line ${line}: TS${code}: ${flattened}`
    })
  }

const findingFromDiagnostic =
  (ownership: HashMap.HashMap<string, CodeFence>) => (diagnostic: ts.Diagnostic) => {
    const flattened = ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")
    const code = diagnostic.code
    const fallback = makeHarnessFinding(code)(flattened)
    const fileOption = Option.fromNullishOr(diagnostic.file)
    const startOption = Option.fromNullishOr(diagnostic.start)
    const located = Option.product(fileOption, startOption)

    return pipe(
      located,
      Option.flatMap(([file, start]) => {
        const normalized = path.normalize(file.fileName)
        const owned = HashMap.get(ownership, normalized)

        return Option.map(owned, (fence) => {
          const position = file.getLineAndCharacterOfPosition(start)
          const displayLine = position.line + 1
          return makeOwnedFinding(fence)(displayLine)(code)(flattened)
        })
      }),
      Option.getOrElse(Function.constant(fallback))
    )
  }

const collectDiagnostics = (materials: FenceMaterials) =>
  Effect.sync(() => {
    const rootFiles = Array.fromIterable(materials.roots)
    const program = ts.createProgram(rootFiles, compilerOptions)
    const diagnostics = ts.getPreEmitDiagnostics(program)
    return Array.fromIterable(diagnostics)
  })

const reduceMaterials = (left: FenceMaterials, right: FenceMaterials) => makeMaterials(left)(right)

export const checkFences = (scratchDirectory: string) =>
  Effect.fn("Typecheck.checkFences")(function* (fences: ReadonlyArray<CodeFence>) {
    yield* prepareScratch(scratchDirectory)

    const scriptFences = Array.filter(fences, scriptFence)
    const written = yield* Effect.forEach(scriptFences, makeFenceMaterialsEffect(scratchDirectory))
    const materials = Array.reduce(written, emptyMaterials, reduceMaterials)
    const diagnostics = yield* collectDiagnostics(materials)
    const toFinding = findingFromDiagnostic(materials.ownership)
    const compilerFindings = Array.map(diagnostics, toFinding)
    const dataFences = Array.filter(fences, dataFence)
    const parserFindings = Array.flatMap(dataFences, dataFindings)

    return Array.appendAll(compilerFindings, parserFindings)
  })
