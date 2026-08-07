import type { SemanticModuleFixtureManifest } from "../../semanticModuleFixtureManifest.js"

export const labelRemapManifest = {
  entities: [
    {
      label: "point-x",
      selector: {
        path: "src/remapped.ts",
        declarationKind: "InterfaceDeclaration",
        displayName: "Vertex",
        occurrence: 1
      }
    },
    {
      label: "point-y",
      selector: {
        path: "src/remapped.ts",
        declarationKind: "InterfaceDeclaration",
        displayName: "Vertex",
        occurrence: 2
      }
    },
    {
      label: "point-namespace",
      selector: {
        path: "src/remapped.ts",
        declarationKind: "ModuleDeclaration",
        displayName: "Vertex",
        occurrence: 1
      }
    }
  ],
  modules: [["point-x", "point-y", "point-namespace"]]
} as const satisfies SemanticModuleFixtureManifest
