import { expectedKeys } from "./semanticModulesExpectedKeys.js"

export const expectedEntities = [
  {
    key: expectedKeys[0],
    declarationAnchors: [expectedKeys[0]],
    stratum: "production",
    displayName: "parse",
    declarationKind: "FunctionDeclaration"
  },
  {
    key: expectedKeys[1],
    declarationAnchors: [expectedKeys[1]],
    stratum: "production",
    displayName: "Box",
    declarationKind: "ClassDeclaration"
  },
  {
    key: expectedKeys[2],
    declarationAnchors: [expectedKeys[2]],
    stratum: "production",
    displayName: "Named",
    declarationKind: "InterfaceDeclaration"
  },
  {
    key: expectedKeys[3],
    declarationAnchors: [expectedKeys[3]],
    stratum: "production",
    displayName: "Identifier",
    declarationKind: "TypeAliasDeclaration"
  },
  {
    key: expectedKeys[4],
    declarationAnchors: [expectedKeys[4]],
    stratum: "production",
    displayName: "Status",
    declarationKind: "EnumDeclaration"
  }
]
