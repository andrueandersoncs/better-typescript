import type { SemanticModuleFixtureManifest } from "../../semanticModuleFixtureManifest.js"

export const splitManifest = {
  entities: [
    {
      label: "SplitTokenLeft",
      selector: {
        path: "src/left.ts",
        declarationKind: "InterfaceDeclaration",
        displayName: "SplitToken",
        occurrence: 1
      }
    },
    {
      label: "SplitTokenRight",
      selector: {
        path: "src/right.ts",
        declarationKind: "InterfaceDeclaration",
        displayName: "SplitToken",
        occurrence: 1
      }
    }
  ],
  modules: [["SplitTokenLeft", "SplitTokenRight"]]
} as const satisfies SemanticModuleFixtureManifest
