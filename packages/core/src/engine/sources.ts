import {
  Array,
  Data,
  Effect,
  Function,
  HashMap,
  MutableList,
  MutableRef,
  Option,
  Schema,
  Scope,
  Stream,
  StreamEmit,
  pipe
} from "effect"
import * as ts from "typescript"
import type { LoadedProject, ProjectConfig } from "../project/loadProject.js"
import { TsNode, TsProgram, TsSourceFile, TsTypeChecker } from "./tsSchema.js"

// The program context travels with the source stream because every node needs the same program, checker, and project root.
export class ProgramContext extends Schema.Class<ProgramContext>(
  "ProgramContext"
)({
  program: TsProgram,
  checker: TsTypeChecker,
  projectRoot: Schema.String
}) {}

export class AstNodeElement extends Schema.Class<AstNodeElement>(
  "AstNodeElement"
)({
  context: ProgramContext,
  sourceFile: TsSourceFile,
  node: TsNode
}) {}

export type AstFold<A> = (accumulator: A, node: ts.Node) => A

export const isProjectSourceFile = (sourceFile: ts.SourceFile): boolean => {
  const normalizedPath = sourceFile.fileName.replaceAll("\\", "/")
  const isInNodeModules = normalizedPath.includes("/node_modules/")
  const isSkippable = sourceFile.isDeclarationFile || isInNodeModules

  return !isSkippable
}

export const contextFor =
  (projectRoot: string) =>
  (program: ts.Program): ProgramContext => {
    const checker = program.getTypeChecker()

    return new ProgramContext({ program, checker, projectRoot })
  }

export const checkableSourceFiles = (
  project: LoadedProject
): Stream.Stream<ts.SourceFile, Error> =>
  pipe(
    project.program.getSourceFiles(),
    Array.filter(isProjectSourceFile),
    Stream.fromIterable
  )

const recordChild =
  (children: MutableList.MutableList<ts.Node>) =>
  (child: ts.Node): false => {
    MutableList.append(children, child)

    return false
  }

export const astChildren = (node: ts.Node): ReadonlyArray<ts.Node> => {
  const children = MutableList.empty<ts.Node>()

  ts.forEachChild(node, recordChild(children))

  return Array.fromIterable(children)
}

export const foldAst =
  <A>(fold: AstFold<A>) =>
  (root: ts.Node) =>
  (initial: A): A => {
    const accumulator = MutableRef.make(initial)
    const visit = (node: ts.Node): false => {
      const current = MutableRef.get(accumulator)
      const folded = fold(current, node)
      MutableRef.set(accumulator, folded)
      ts.forEachChild(node, visit)

      return false
    }
    visit(root)

    return MutableRef.get(accumulator)
  }

const appendAstNode =
  (context: ProgramContext) =>
  (sourceFile: ts.SourceFile) =>
  (
    nodes: MutableList.MutableList<AstNodeElement>,
    node: ts.Node
  ): MutableList.MutableList<AstNodeElement> => {
    const element = new AstNodeElement({ context, sourceFile, node })

    return MutableList.append(nodes, element)
  }

const astNodeStream =
  (context: ProgramContext) =>
  (sourceFile: ts.SourceFile): Stream.Stream<AstNodeElement> => {
    const initial = MutableList.empty<AstNodeElement>()
    const append = appendAstNode(context)(sourceFile)
    const collected = foldAst(append)(sourceFile)(initial)
    const nodes = Array.fromIterable(collected)

    return Stream.fromIterable(nodes)
  }

export const astNodesFromContext = (
  context: ProgramContext
): Stream.Stream<AstNodeElement, Error> =>
  pipe(
    context.program.getSourceFiles(),
    Array.filter(isProjectSourceFile),
    Stream.fromIterable,
    Stream.flatMap(astNodeStream(context))
  )

export const astNodes = (
  project: LoadedProject
): Stream.Stream<AstNodeElement, Error> =>
  pipe(project.program, contextFor(project.rootPath), astNodesFromContext)

/**
 * One rebuild's file-level diff against the previous program: changed carries
 * the checkable source files whose object identity differs (the abstract
 * builder reuses unchanged ts.SourceFile instances, so identity is content
 * equality there), removed carries the absolute fileNames that disappeared.
 */
export class SourceUpdate extends Data.Class<{
  readonly context: ProgramContext
  readonly changed: ReadonlyArray<ts.SourceFile>
  readonly removed: ReadonlyArray<string>
}> {}

// Reporter diagnostics stay silent because the watcher must retain the last valid program through a transient config failure.
const ignoreDiagnostic = (_diagnostic: ts.Diagnostic): false => false

const emitProgramContext =
  (emit: StreamEmit.EmitOpsPush<Error, ProgramContext>) =>
  (rootPath: string) =>
  (builder: ts.BuilderProgram): boolean => {
    const program = builder.getProgram()
    const context = contextFor(rootPath)(program)

    return emit.single(context)
  }

const startWatch =
  (config: ProjectConfig) =>
  (watchOptions: Option.Option<ts.WatchOptions>) =>
  (emit: StreamEmit.EmitOpsPush<Error, ProgramContext>) =>
  (): ts.WatchOfConfigFile<ts.BuilderProgram> => {
    const watchOptionsToExtend = Option.getOrUndefined(watchOptions)
    const host = ts.createWatchCompilerHost(
      config.configPath,
      undefined,
      ts.sys,
      ts.createAbstractBuilder,
      ignoreDiagnostic,
      ignoreDiagnostic,
      watchOptionsToExtend
    )

    // Assign the handler after construction because createWatchProgram emits the initial program synchronously and asyncPush buffers it.
    host.afterProgramCreate = emitProgramContext(emit)(config.rootPath)

    return ts.createWatchProgram(host)
  }

const stopWatch = (
  watch: ts.WatchOfConfigFile<ts.BuilderProgram>
): Effect.Effect<void> =>
  Effect.sync(() => {
    watch.close()
  })

const acquireWatch =
  (config: ProjectConfig) =>
  (watchOptions: Option.Option<ts.WatchOptions>) =>
  (
    emit: StreamEmit.EmitOpsPush<Error, ProgramContext>
  ): Effect.Effect<
    ts.WatchOfConfigFile<ts.BuilderProgram>,
    never,
    Scope.Scope
  > => {
    const acquire = Effect.sync(startWatch(config)(watchOptions)(emit))

    return Effect.acquireRelease(acquire, stopWatch)
  }

/**
 * The project-level root signal: one fresh ProgramContext per watch rebuild,
 * covering file edits, adds, deletes, and leaf tsconfig edits.
 */
export const programUpdates = (
  config: ProjectConfig,
  watchOptions: Option.Option<ts.WatchOptions>
): Stream.Stream<ProgramContext, Error> =>
  Stream.asyncPush<ProgramContext, Error>(acquireWatch(config)(watchOptions))

const emptyFileIndex: HashMap.HashMap<string, ts.SourceFile> = HashMap.empty()

const isChangedFile =
  (previous: HashMap.HashMap<string, ts.SourceFile>) =>
  (sourceFile: ts.SourceFile): boolean =>
    pipe(
      HashMap.get(previous, sourceFile.fileName),
      Option.match({
        onNone: Function.constant(true),
        onSome: (known) => known !== sourceFile
      })
    )

const isRemovedFrom =
  (next: HashMap.HashMap<string, ts.SourceFile>) =>
  (fileName: string): boolean =>
    !HashMap.has(next, fileName)

const fileIndexEntry = (
  sourceFile: ts.SourceFile
): readonly [string, ts.SourceFile] => [sourceFile.fileName, sourceFile]

/**
 * Pure diff of one rebuilt program against the previous file index. Identity
 * diffing may over-report changed files (a redundant recompute at worst); it
 * never under-reports.
 */
export const diffCheckableFiles =
  (previous: HashMap.HashMap<string, ts.SourceFile>) =>
  (
    context: ProgramContext
  ): readonly [HashMap.HashMap<string, ts.SourceFile>, SourceUpdate] => {
    const currentFiles = pipe(
      context.program.getSourceFiles(),
      Array.filter(isProjectSourceFile)
    )
    const next = pipe(
      currentFiles,
      Array.map(fileIndexEntry),
      HashMap.fromIterable
    )
    const changed = Array.filter(currentFiles, isChangedFile(previous))
    const removed = pipe(
      previous,
      HashMap.keys,
      Array.fromIterable,
      Array.filter(isRemovedFrom(next))
    )
    const update = new SourceUpdate({ context, changed, removed })

    return [next, update]
  }

/**
 * The file-level root signal: per rebuild, which checkable source files
 * changed and which paths disappeared (first emission: all checkable files).
 */
export const sourceUpdates = (
  config: ProjectConfig,
  watchOptions: Option.Option<ts.WatchOptions>
): Stream.Stream<SourceUpdate, Error> =>
  pipe(
    programUpdates(config, watchOptions),
    Stream.mapAccum(emptyFileIndex, (previous, context) =>
      diffCheckableFiles(previous)(context)
    )
  )
