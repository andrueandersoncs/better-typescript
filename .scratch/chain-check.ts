// 1) Does prefer-conditional-return's mandated ternary trip
//    no-multiple-boolean-operators when the condition is a comparison?
// 2) Does annotating a DOM-style handler with an explicit void function type
//    escape no-void-functions?
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import * as ts from "typescript"
import { LoadedProject } from "../src/project/loadProject.js"
import { rules } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDirectory, "..")
const setRoot = path.join(repoRoot, ".scratch", "chain-project")

const cases: ReadonlyArray<readonly [string, string]> = [
  [
    // The rewrite prefer-conditional-return demands for an if/else on a comparison.
    "ternaryComparison.ts",
    `declare const status: number

export const label = (): string =>
  status === 1 ? "one" : "other"
`
  ],
  [
    // The if/else form the ternary came from.
    "ifComparison.ts",
    `declare const status: number

export const label = (): string => {
  if (status === 1) {
    return "one"
  } else {
    return "other"
  }
}
`
  ],
  [
    // Annotation escape for a void handler (no lib types involved).
    "annotatedVoidHandler.ts",
    `interface DataEvent {
  readonly data: string
}

declare const subscribe: (handler: (event: DataEvent) => void) => void

const logEvent: (event: DataEvent) => void = (event) => {
  console.log(event.data)
}

subscribe(logEvent)
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

console.log(`TOTAL matches: ${matches.length}`)
for (const match of matches) {
  console.log(
    `  ${match.fileName}:${match.line} [${match.ruleId}] ${match.message}`
  )
}
