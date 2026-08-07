import type { SemanticModuleFixtureManifest } from "../../semanticModuleFixtureManifest.js"

export const dependenciesManifest = {
  entities: [
    {
      label: "User",
      selector: {
        path: "src/deps.ts",
        declarationKind: "InterfaceDeclaration",
        displayName: "User",
        occurrence: 1
      }
    },
    {
      label: "makeUser",
      selector: {
        path: "src/deps.ts",
        declarationKind: "VariableDeclaration",
        displayName: "makeUser",
        occurrence: 1
      }
    },
    {
      label: "saveUser",
      selector: {
        path: "src/deps.ts",
        declarationKind: "VariableDeclaration",
        displayName: "saveUser",
        occurrence: 1
      }
    },
    {
      label: "isEven",
      selector: {
        path: "src/deps.ts",
        declarationKind: "FunctionDeclaration",
        displayName: "isEven",
        occurrence: 1
      }
    },
    {
      label: "isOdd",
      selector: {
        path: "src/deps.ts",
        declarationKind: "FunctionDeclaration",
        displayName: "isOdd",
        occurrence: 1
      }
    },
    {
      label: "Service",
      selector: {
        path: "src/deps.ts",
        declarationKind: "ClassDeclaration",
        displayName: "Service",
        occurrence: 1
      }
    },
    {
      label: "Client",
      selector: {
        path: "src/deps.ts",
        declarationKind: "ClassDeclaration",
        displayName: "Client",
        occurrence: 1
      }
    },
    {
      label: "trimOrderId",
      selector: {
        path: "src/deps.ts",
        declarationKind: "VariableDeclaration",
        displayName: "trimOrderId",
        occurrence: 1
      }
    },
    {
      label: "normalizeOrder",
      selector: {
        path: "src/deps.ts",
        declarationKind: "VariableDeclaration",
        displayName: "normalizeOrder",
        occurrence: 1
      }
    },
    {
      label: "parseOrder",
      selector: {
        path: "src/deps.ts",
        declarationKind: "VariableDeclaration",
        displayName: "parseOrder",
        occurrence: 1
      }
    },
    {
      label: "unownedHelper",
      selector: {
        path: "src/deps.ts",
        declarationKind: "VariableDeclaration",
        displayName: "unownedHelper",
        occurrence: 1
      }
    },
    {
      label: "ownedConsumer",
      selector: {
        path: "src/deps.ts",
        declarationKind: "VariableDeclaration",
        displayName: "ownedConsumer",
        occurrence: 1
      }
    },
    {
      label: "aliasedHelper",
      selector: {
        path: "src/target.ts",
        declarationKind: "VariableDeclaration",
        displayName: "aliasedHelper",
        occurrence: 1
      }
    },
    {
      label: "aliasConsumer",
      selector: {
        path: "src/consumer.ts",
        declarationKind: "VariableDeclaration",
        displayName: "aliasConsumer",
        occurrence: 1
      }
    }
  ],
  modules: [
    ["aliasConsumer"],
    ["User"],
    ["makeUser"],
    ["saveUser"],
    ["isEven"],
    ["isOdd"],
    ["trimOrderId"],
    ["normalizeOrder"],
    ["parseOrder"],
    ["unownedHelper"],
    ["ownedConsumer"],
    ["Service"],
    ["Client"],
    ["aliasedHelper"]
  ]
} as const satisfies SemanticModuleFixtureManifest
