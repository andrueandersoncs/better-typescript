// Does annotating with a lib-exported type escape the interop trap?
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import * as ts from "typescript"
import { LoadedProject } from "../src/project/loadProject.js"
import { rules } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDirectory, "..")
const setRoot = path.join(repoRoot, ".scratch", "escape-project")

const fakelibDts = `
export type FileCallback = (err: Error | undefined, data: string) => void
export declare const readFileCb: (path: string, callback: FileCallback) => void
`

const cases: ReadonlyArray<readonly [string, string]> = [
  [
    // Escape attempt A: variable annotated with the lib's exported callback
    // type; parameter types inferred, so no undefined keyword in our file.
    "annotatedHandler.ts",
    `import { readFileCb } from "fakelib"
import type { FileCallback } from "fakelib"

const handleFile: FileCallback = (err, data) => {
  console.log(err, data)
}

readFileCb("config.json", handleFile)
`
  ],
  [
    // Escape attempt B: same, but the lib does NOT export the type, so we
    // must write the signature ourselves.
    "selfTypedHandler.ts",
    `import { readFileCb } from "fakelib"

type FileHandler = (err: Error | undefined, data: string) => void

const handleFile: FileHandler = (err, data) => {
  console.log(err, data)
}

readFileCb("config.json", handleFile)
`
  ]
]

const compilerOptions = ts.convertCompilerOptionsFromJson(
  {
    target: "ES2022",
    module: "NodeNext",
    moduleResolution: "NodeNext",
    lib: ["ES2022", "DOM"],
    types: ["node"],
    strict: true,
    skipLibCheck: true,
    noEmit: true
  },
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

console.log(`\nTOTAL matches: ${matches.length}`)
for (const match of matches) {
  console.log(
    `  ${match.fileName}:${match.line} [${match.ruleId}] ${match.message}`
  )
}
