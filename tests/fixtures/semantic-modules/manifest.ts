import type { SemanticModuleFixtureManifest } from "../../semanticModuleFixtureManifest.js"

export const singletonManifest = {
  entities: [
    {
      label: "parse",
      selector: {
        path: "src/singletons.ts",
        declarationKind: "FunctionDeclaration",
        displayName: "parse",
        occurrence: 1
      }
    },
    {
      label: "Box",
      selector: {
        path: "src/singletons.ts",
        declarationKind: "ClassDeclaration",
        displayName: "Box",
        occurrence: 1
      }
    },
    {
      label: "Named",
      selector: {
        path: "src/singletons.ts",
        declarationKind: "InterfaceDeclaration",
        displayName: "Named",
        occurrence: 1
      }
    },
    {
      label: "Identifier",
      selector: {
        path: "src/singletons.ts",
        declarationKind: "TypeAliasDeclaration",
        displayName: "Identifier",
        occurrence: 1
      }
    },
    {
      label: "Status",
      selector: {
        path: "src/status.ts",
        declarationKind: "EnumDeclaration",
        displayName: "Status",
        occurrence: 1
      }
    }
  ],
  modules: [["parse"], ["Box"], ["Named"], ["Identifier"], ["Status"]]
} as const satisfies SemanticModuleFixtureManifest
