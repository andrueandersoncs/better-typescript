// Third-party interop audit: realistic code at library boundaries, with the
// third-party declarations living in (virtual) node_modules so first-party
// carve-outs are exercised honestly.
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import * as ts from "typescript"
import { LoadedProject } from "../src/project/loadProject.js"
import { rules } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDirectory, "..")
const setRoot = path.join(repoRoot, ".scratch", "interop-project")

const fakelibDts = `
export interface Readable {
  pipe<T extends Writable>(destination: T): T
}
export interface Writable {
  write(chunk: string): boolean
}
export interface Observable<T> {
  pipe<R>(op: (source: Observable<T>) => Observable<R>): Observable<R>
  subscribe(next: (value: T) => void): void
}
export interface RequestOptions {
  readonly timeout?: number
  readonly retries?: number
}
export interface Logger {
  log(message: string): void
}
export declare const createReadStream: (path: string) => Readable
export declare const createWriteStream: (path: string) => Writable
export declare const request: (url: string, options: RequestOptions) => Promise<string>
export declare const takesMap: (lookup: Map<string, string>) => void
export declare const readFileCb: (path: string, callback: (err: Error | undefined, data: string) => void) => void
export declare const onShutdown: (hook: () => Promise<void>) => void
export type LibResult =
  | { readonly _tag: "Ok"; readonly value: string }
  | { readonly _tag: "Err"; readonly error: string }
export declare const runLib: () => LibResult
export interface EventSource {
  addEventListener(type: string, listener: (event: { readonly data: string }) => void): void
}
export declare const source: EventSource
`

const cases: ReadonlyArray<readonly [string, string]> = [
  [
    "nodeStreamPipe.ts",
    `import { createReadStream, createWriteStream } from "fakelib"

const reader = createReadStream("in.txt")
const writer = createWriteStream("out.txt")
export const piped = reader.pipe(writer)
`
  ],
  [
    "optionalOptions.ts",
    `import { request } from "fakelib"

export const fetchWithTimeout = (url: string, timeout?: number): Promise<string> =>
  request(url, { timeout })
`
  ],
  [
    "mapBoundary.ts",
    `import { takesMap } from "fakelib"

const lookup = new Map<string, string>([["a", "1"]])
takesMap(lookup)
`
  ],
  [
    "errorFirstCallback.ts",
    `import { readFileCb } from "fakelib"

const handleFile = (err: Error | undefined, data: string): void => {
  console.log(err, data)
}

readFileCb("config.json", handleFile)
`
  ],
  [
    "asyncHook.ts",
    `import { onShutdown } from "fakelib"

const flushLogs = async (): Promise<void> => {
  await Promise.resolve()
}

onShutdown(flushLogs)
`
  ],
  [
    "thirdPartyTag.ts",
    `import { runLib } from "fakelib"

export const describe = (): string => {
  const result = runLib()

  return result._tag === "Ok" ? result.value : result.error
}
`
  ],
  [
    "namedEventHandler.ts",
    `import { source } from "fakelib"

interface DataEvent {
  readonly data: string
}

const logEvent = (event: DataEvent): void => {
  console.log(event.data)
}

source.addEventListener("message", logEvent)
`
  ],
  [
    "inlineEventHandler.ts",
    `import { source } from "fakelib"

source.addEventListener("message", (event) => {
  console.log(event.data)
})
`
  ],
  [
    "implementLogger.ts",
    `import type { Logger } from "fakelib"

export const consoleLogger: Logger = {
  log(message: string): void {
    console.log(message)
  }
}
`
  ]
]

const compilerOptionsJson = {
  target: "ES2022",
  module: "NodeNext",
  moduleResolution: "NodeNext",
  lib: ["ES2022", "DOM"],
  types: ["node"],
  strict: true,
  skipLibCheck: true,
  noEmit: true
}

const compilerOptions = ts.convertCompilerOptionsFromJson(
  compilerOptionsJson,
  repoRoot
).options

const virtualFiles = new Map<string, string>()
virtualFiles.set(
  path.join(setRoot, "node_modules", "fakelib", "package.json"),
  JSON.stringify({ name: "fakelib", version: "1.0.0", types: "index.d.ts" })
)
virtualFiles.set(
  path.join(setRoot, "node_modules", "fakelib", "index.d.ts"),
  fakelibDts
)
for (const [fileName, code] of cases) {
  virtualFiles.set(path.join(setRoot, "src", fileName), code)
}

const sharedHost = ts.createCompilerHost(compilerOptions)

const virtualHost: ts.CompilerHost = {
  ...sharedHost,
  fileExists: (fileName) =>
    virtualFiles.has(fileName) || sharedHost.fileExists(fileName),
  readFile: (fileName) =>
    virtualFiles.get(fileName) ?? sharedHost.readFile(fileName),
  directoryExists: (directoryName) => {
    const prefix = directoryName.endsWith(path.sep)
      ? directoryName
      : directoryName + path.sep
    return (
      [...virtualFiles.keys()].some((f) => f.startsWith(prefix)) ||
      ts.sys.directoryExists(directoryName)
    )
  },
  realpath: (fileName) =>
    virtualFiles.has(fileName)
      ? fileName
      : (ts.sys.realpath?.(fileName) ?? fileName),
  getSourceFile: (fileName, languageVersion) => {
    const virtualText = virtualFiles.get(fileName)
    return virtualText === undefined
      ? sharedHost.getSourceFile(fileName, languageVersion)
      : ts.createSourceFile(fileName, virtualText, languageVersion)
  },
  writeFile: () => {}
}

const rootNames = cases.map(([fileName]) => path.join(setRoot, "src", fileName))
const program = ts.createProgram({
  rootNames,
  options: compilerOptions,
  host: virtualHost
})

const compileErrors = rootNames.flatMap((fileName) => {
  const sourceFile = program.getSourceFile(fileName)
  if (sourceFile === undefined) return [`${fileName}: missing`]
  return [
    ...program.getSyntacticDiagnostics(sourceFile),
    ...program.getSemanticDiagnostics(sourceFile)
  ].map(
    (d) =>
      `${path.basename(fileName)}: ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`
  )
})

if (compileErrors.length > 0) {
  console.log("COMPILE ERRORS:")
  for (const err of compileErrors) console.log("  " + err)
}

const loadedProject = new LoadedProject({
  program,
  configPath: path.join(setRoot, "tsconfig.json"),
  rootPath: setRoot
})

const matches = runRules([...rules])(loadedProject)

console.log(`\nTOTAL matches on interop fixture: ${matches.length}\n`)
const byFile = new Map<string, typeof matches>()
for (const match of matches) {
  const list = byFile.get(match.fileName) ?? []
  byFile.set(match.fileName, [...list, match])
}
for (const [fileName, fileMatches] of [...byFile.entries()].sort()) {
  console.log(`## ${fileName}`)
  for (const match of fileMatches) {
    console.log(`  L${match.line} [${match.ruleId}] ${match.message}`)
  }
  console.log()
}
