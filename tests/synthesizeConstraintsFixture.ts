import {
  Constraint,
  ConstraintDocument,
  Definition,
  Example,
  ViolationClass
} from "../scripts/synthesizeConstraints/data.ts"

/**
 * A minimal constraint document that passes every audit.
 *
 * Tests mutate one field of this fixture to prove that exactly one audit code
 * fires. Keeping the clean baseline in one place means a new obligation added to
 * the audit shows up as a failing baseline rather than as silently unexercised
 * code.
 */

export const violationClasses: ReadonlyArray<ViolationClass> = [
  ViolationClass.make({
    id: "unbounded-source-placement",
    summary: "A source file is placed outside the addressable package layout.",
    technology: "TypeScript",
    observable: "A program source file whose repository-relative path fails the placement grammar."
  })
]

const example = (
  label: Example["label"],
  demonstrates: ReadonlyArray<string>,
  code: string
): Example => Example.make({ label, language: "ts", demonstrates, code })

export const sourceFile: Definition = Definition.make({
  term: "Source file",
  prose:
    "A source file is one parsed TypeScript file selected by a program. Its observable inputs are its normalized absolute filename and its parsed contents.",
  dependsOn: [],
  enumeratedItems: ["normalized absolute filename", "parsed contents"],
  contraries: [],
  relatedTerms: [],
  comparisonExamples: [],
  mechanicalPredicate:
    "Given a program and a candidate file, return true when the program selected that file and it is not a declaration file.",
  predicateImplementation: [
    'import * as ts from "typescript"',
    "",
    "export const isSourceFile = (program: ts.Program, file: ts.SourceFile): boolean =>",
    "  program.getSourceFiles().includes(file) && !file.isDeclarationFile"
  ].join("\n"),
  examples: [
    example(
      "plain",
      ["normalized absolute filename", "parsed contents"],
      [
        'import * as ts from "typescript"',
        "",
        "// normalized absolute filename: the compiler-normalized name the program selected.",
        'export const selected = "/work/app/greet.ts"',
        "",
        "// parsed contents: the AST the program produced for that name.",
        "export const parsed: ts.SourceFile = ts.createSourceFile(",
        "  selected,",
        '  "export const greeting = 1",',
        "  ts.ScriptTarget.ES2022",
        ")"
      ].join("\n")
    )
  ]
})

export const projectSourceFile: Definition = Definition.make({
  term: "Project source file",
  prose:
    "A source file is a project source file when its filename resolves below the directory holding the configuration that created the program, rather than above it.",
  dependsOn: ["Source file"],
  enumeratedItems: ["resolves below the configuration directory"],
  contraries: ["resolves above the configuration directory"],
  relatedTerms: [
    {
      term: "Source file",
      relation: "Broader category this term narrows.",
      decidingDistinction: "Whether the resolved filename lies below the configuration directory.",
      whyNotInterchangeable:
        "A placement rule that accepted any source file would accept a file outside the project it governs."
    }
  ],
  comparisonExamples: [
    example(
      "plain",
      ["resolves below the configuration directory"],
      [
        'import * as path from "node:path"',
        "",
        "// Project source file: resolves below the configuration directory.",
        'export const inside = path.relative("/work/app", "/work/app/greet.ts")',
        "",
        "// Source file only: resolves above the configuration directory.",
        'export const outside = path.relative("/work/app", "/work/shared/greet.ts")'
      ].join("\n")
    )
  ],
  mechanicalPredicate:
    "Given the configuration pathname and a candidate filename, return true when the relative path is nonempty and does not begin with a parent segment.",
  predicateImplementation: [
    'import * as path from "node:path"',
    "",
    "export const isProjectSourceFile = (configFile: string, fileName: string): boolean => {",
    "  const relative = path.relative(path.dirname(configFile), fileName)",
    '  return relative !== "" && !relative.startsWith("..")',
    "}"
  ].join("\n"),
  examples: [
    example(
      "this",
      ["resolves below the configuration directory"],
      [
        "// resolves below the configuration directory: /work/app/src/greet.ts under /work/app.",
        'export const greeting = "hello"'
      ].join("\n")
    ),
    example(
      "notThis",
      ["resolves above the configuration directory"],
      [
        "// resolves above the configuration directory: /work/shared/greet.ts is not under /work/app.",
        'export const greeting = "hello"'
      ].join("\n")
    )
  ]
})

export const placementConstraint: Constraint = Constraint.make({
  title: "Source placement",
  statement:
    "Every project source file MUST have a repository-relative pathname matching the package placement grammar, verified by testing that grammar against every selected filename.",
  violationClassIds: ["unbounded-source-placement"],
  propertyProtected:
    "One file at one predictable address. It prevents unaddressable placement and ambiguous aggregator entry points.",
  rationale:
    "A grammar over the whole path leaves no position where a file can hide, so an import identifies exactly one owned surface. A rule over the basename alone would accept a correctly named file in an arbitrary directory.",
  verification:
    "Enumerate every selected filename, normalize it against the repository root, and test the placement grammar. Success has zero findings; each mismatch reports the filename.",
  verificationImplementation: [
    'import * as path from "node:path"',
    "",
    "const grammar = /^packages\\/[a-z][a-z0-9-]*\\/src\\/(?:[a-z][a-z0-9-]*\\/)*[a-z][a-z0-9-]*\\.ts$/",
    "",
    "export const placementFindings = (",
    "  root: string,",
    "  fileNames: ReadonlyArray<string>",
    "): ReadonlyArray<string> =>",
    "  fileNames",
    '    .map((fileName) => path.relative(root, fileName).split(path.sep).join("/"))',
    "    .filter((relative) => !grammar.test(relative))"
  ].join("\n"),
  allowedExample: [
    "// packages/app/src/user-name.ts",
    "export const normalizeUserName = (value: string): string => value.trim()"
  ].join("\n"),
  violatingExample: [
    "// src/userName.ts sits outside the package placement grammar.",
    "export const normalizeUserName = (value: string): string => value.trim()"
  ].join("\n")
})

export const cleanDocument = (): ConstraintDocument =>
  ConstraintDocument.make({
    title: "Addressable source placement constraints",
    informalDefinition:
      "Addressable source placement means a reader can predict where any unit of the project lives from what it does, and can predict what a file contains from where it lives. The project excludes files placed outside the package layout and aggregator entry points whose surface nobody owns.",
    definitions: [sourceFile, projectSourceFile],
    constraints: [placementConstraint]
  })
