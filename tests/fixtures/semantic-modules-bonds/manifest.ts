import type { SemanticModuleFixtureManifest } from "../../semanticModuleFixtureManifest.js"

export const bondsManifest = {
  entities: [
    {
      label: "codec-function",
      selector: {
        path: "src/codec.ts",
        declarationKind: "FunctionDeclaration",
        displayName: "Codec",
        occurrence: 1
      }
    },
    {
      label: "codec-namespace",
      selector: {
        path: "src/codec.ts",
        declarationKind: "ModuleDeclaration",
        displayName: "Codec",
        occurrence: 1
      }
    },
    {
      label: "codec-unrelated",
      selector: {
        path: "src/codec.ts",
        declarationKind: "VariableDeclaration",
        displayName: "unrelated",
        occurrence: 1
      }
    },
    {
      label: "box-value",
      selector: {
        path: "src/companions.ts",
        declarationKind: "InterfaceDeclaration",
        displayName: "Box",
        occurrence: 1
      }
    },
    {
      label: "box-size",
      selector: {
        path: "src/companions.ts",
        declarationKind: "InterfaceDeclaration",
        displayName: "Box",
        occurrence: 2
      }
    },
    {
      label: "token-type",
      selector: {
        path: "src/companions.ts",
        declarationKind: "TypeAliasDeclaration",
        displayName: "Token",
        occurrence: 1
      }
    },
    {
      label: "token-value",
      selector: {
        path: "src/companions.ts",
        declarationKind: "VariableDeclaration",
        displayName: "Token",
        occurrence: 1
      }
    },
    {
      label: "unrelated-const",
      selector: {
        path: "src/companions.ts",
        declarationKind: "VariableDeclaration",
        displayName: "unrelated",
        occurrence: 1
      }
    },
    {
      label: "box-test",
      selector: {
        path: "src/tests/boxTest.ts",
        declarationKind: "InterfaceDeclaration",
        displayName: "Box",
        occurrence: 1
      }
    }
  ],
  modules: [
    ["codec-function", "codec-namespace"],
    ["codec-unrelated"],
    ["box-value", "box-size"],
    ["token-type", "token-value"],
    ["unrelated-const"],
    ["box-test"]
  ]
} as const satisfies SemanticModuleFixtureManifest
