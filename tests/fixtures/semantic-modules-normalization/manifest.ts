import type { SemanticModuleFixtureManifest } from "../../semanticModuleFixtures.js"

export const normalizationManifest = {
  entities: [
    {
      label: "anonymous-class",
      selector: {
        path: "src/defaultAnonymousClass.ts",
        declarationKind: "ClassDeclaration",
        displayName: "<default class>",
        occurrence: 1
      }
    },
    {
      label: "anonymous-function",
      selector: {
        path: "src/defaultAnonymousFunction.ts",
        declarationKind: "FunctionDeclaration",
        displayName: "<default function>",
        occurrence: 1
      }
    },
    {
      label: "named-class",
      selector: {
        path: "src/defaultNamedClass.ts",
        declarationKind: "ClassDeclaration",
        displayName: "NamedDefaultClass",
        occurrence: 1
      }
    },
    {
      label: "named-function",
      selector: {
        path: "src/defaultNamedFunction.ts",
        declarationKind: "FunctionDeclaration",
        displayName: "namedDefaultFunction",
        occurrence: 1
      }
    },
    {
      label: "combined-left",
      selector: {
        path: "src/merges.ts",
        declarationKind: "InterfaceDeclaration",
        displayName: "Combined",
        occurrence: 1
      }
    },
    {
      label: "combined-right",
      selector: {
        path: "src/merges.ts",
        declarationKind: "InterfaceDeclaration",
        displayName: "Combined",
        occurrence: 2
      }
    },
    {
      label: "service-class",
      selector: {
        path: "src/merges.ts",
        declarationKind: "ClassDeclaration",
        displayName: "Service",
        occurrence: 1
      }
    },
    {
      label: "service-namespace",
      selector: {
        path: "src/merges.ts",
        declarationKind: "ModuleDeclaration",
        displayName: "Service",
        occurrence: 1
      }
    },
    {
      label: "repeat-first",
      selector: {
        path: "src/namespaces.ts",
        declarationKind: "ModuleDeclaration",
        displayName: "Repeat",
        occurrence: 1
      }
    },
    {
      label: "repeat-second",
      selector: {
        path: "src/namespaces.ts",
        declarationKind: "ModuleDeclaration",
        displayName: "Repeat",
        occurrence: 2
      }
    },
    {
      label: "dotted",
      selector: {
        path: "src/namespaces.ts",
        declarationKind: "ModuleDeclaration",
        displayName: "Dotted.Inner",
        occurrence: 1
      }
    },
    {
      label: "parse-overload",
      selector: {
        path: "src/overloads.ts",
        declarationKind: "FunctionDeclaration",
        displayName: "parse",
        occurrence: 1
      }
    },
    {
      label: "single-variable",
      selector: {
        path: "src/variables.ts",
        declarationKind: "VariableDeclaration",
        displayName: "single",
        occurrence: 1
      }
    },
    {
      label: "destructured-variable",
      selector: {
        path: "src/variables.ts",
        declarationKind: "VariableDeclaration",
        displayName: "renamed, first, rest",
        occurrence: 1
      }
    }
  ],
  modules: [
    ["anonymous-class"],
    ["anonymous-function"],
    ["named-class"],
    ["named-function"],
    ["combined-left"],
    ["combined-right"],
    ["service-class"],
    ["service-namespace"],
    ["repeat-first"],
    ["repeat-second"],
    ["dotted"],
    ["parse-overload"],
    ["single-variable"],
    ["destructured-variable"]
  ]
} as const satisfies SemanticModuleFixtureManifest
