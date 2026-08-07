import type { SemanticModuleFixtureManifest } from "../../semanticModuleFixtureManifest.js"

export const orderingManifest = {
  entities: [
    {
      label: "OrderFirstA",
      selector: {
        path: "src/a.ts",
        declarationKind: "InterfaceDeclaration",
        displayName: "OrderFirst",
        occurrence: 1
      }
    },
    {
      label: "OrderLocalA",
      selector: {
        path: "src/a.ts",
        declarationKind: "TypeAliasDeclaration",
        displayName: "OrderLocalA",
        occurrence: 1
      }
    },
    {
      label: "OrderLocalB",
      selector: {
        path: "src/a.ts",
        declarationKind: "TypeAliasDeclaration",
        displayName: "OrderLocalB",
        occurrence: 1
      }
    },
    {
      label: "OrderFirstB",
      selector: {
        path: "src/b.ts",
        declarationKind: "InterfaceDeclaration",
        displayName: "OrderFirst",
        occurrence: 1
      }
    },
    {
      label: "OrderSecondB",
      selector: {
        path: "src/b.ts",
        declarationKind: "InterfaceDeclaration",
        displayName: "OrderSecond",
        occurrence: 1
      }
    },
    {
      label: "OrderSecondC",
      selector: {
        path: "src/c.ts",
        declarationKind: "InterfaceDeclaration",
        displayName: "OrderSecond",
        occurrence: 1
      }
    },
    {
      label: "OrderLocalC",
      selector: {
        path: "src/c.ts",
        declarationKind: "TypeAliasDeclaration",
        displayName: "OrderLocalC",
        occurrence: 1
      }
    }
  ],
  modules: [
    ["OrderFirstA", "OrderFirstB"],
    ["OrderLocalA"],
    ["OrderLocalB"],
    ["OrderSecondB", "OrderSecondC"],
    ["OrderLocalC"]
  ]
} as const satisfies SemanticModuleFixtureManifest
