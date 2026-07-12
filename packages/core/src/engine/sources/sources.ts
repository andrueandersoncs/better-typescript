import {
  Tuple,
  Array,
  Effect,
  Function,
  HashMap,
  MutableList,
  MutableRef,
  Option,
  Stream,
  pipe
} from "effect"
import * as ts from "typescript"
import type {
  LoadedProject,
  ProjectConfig
} from "../../project/loadProject/data.js"
import { AstNodeElement, ProgramContext, SourceUpdate } from "./data.js"

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

export const astChildren = (node: ts.Node): ReadonlyArray<ts.Node> => {
  const children = MutableList.empty<ts.Node>()

  ts.forEachChild(node, (child) => {
    MutableList.append(children, child)

    return false
  })

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

export const astNodesFromContext = (
  context: ProgramContext
): Stream.Stream<AstNodeElement, Error> =>
  pipe(
    context.program.getSourceFiles(),
    Array.filter(isProjectSourceFile),
    Stream.fromIterable,
    Stream.flatMap((sourceFile) => {
      const initial = MutableList.empty<AstNodeElement>()

      const append = (
        nodes: MutableList.MutableList<AstNodeElement>,
        node: ts.Node
      ): MutableList.MutableList<AstNodeElement> => {
        const element = new AstNodeElement({ context, sourceFile, node })

        return MutableList.append(nodes, element)
      }

      const collected = foldAst(append)(sourceFile)(initial)
      const nodes = Array.fromIterable(collected)

      return Stream.fromIterable(nodes)
    })
  )

export const astNodes = (
  project: LoadedProject
): Stream.Stream<AstNodeElement, Error> =>
  pipe(project.program, contextFor(project.rootPath), astNodesFromContext)

// Reporter diagnostics stay silent because the watcher must retain the last valid program through a transient config failure.
const ignoreDiagnostic = (_diagnostic: ts.Diagnostic): false => false

const stopWatch = (
  watch: ts.WatchOfConfigFile<ts.BuilderProgram>
): Effect.Effect<void> =>
  Effect.sync(() => {
    watch.close()
  })

/**
 * The project-level root signal: one fresh ProgramContext per watch rebuild,
 * covering file edits, adds, deletes, and leaf tsconfig edits.
 */
export const programUpdates = (
  config: ProjectConfig,
  watchOptions: Option.Option<ts.WatchOptions>
): Stream.Stream<ProgramContext, Error> =>
  Stream.asyncPush<ProgramContext, Error>((emit) => {
    const acquire = Effect.sync(() => {
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
      const afterProgramCreate = (builder: ts.BuilderProgram): boolean => {
        const program = builder.getProgram()
        const context = contextFor(config.rootPath)(program)

        return emit.single(context)
      }

      host.afterProgramCreate = afterProgramCreate

      return ts.createWatchProgram(host)
    })

    return Effect.acquireRelease(acquire, stopWatch)
  })

const emptyFileIndex: HashMap.HashMap<string, ts.SourceFile> = HashMap.empty()

const fileIndexEntry = (
  sourceFile: ts.SourceFile
): readonly [string, ts.SourceFile] =>
  Tuple.make(sourceFile.fileName, sourceFile)

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

    const changed = Array.filter(currentFiles, (sourceFile) =>
      pipe(
        HashMap.get(previous, sourceFile.fileName),
        Option.match({
          onNone: Function.constant(true),
          onSome: (known) => known !== sourceFile
        })
      )
    )

    const removed = pipe(
      previous,
      HashMap.keys,
      Array.fromIterable,
      Array.filter((fileName) => !HashMap.has(next, fileName))
    )

    const update = new SourceUpdate({ context, changed, removed })

    return Tuple.make(next, update)
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
