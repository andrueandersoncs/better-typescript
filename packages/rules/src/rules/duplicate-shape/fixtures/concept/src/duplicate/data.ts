interface PrimaryAddress {
  readonly uniqueStreetName: string
}

interface SecondaryAddress {
  readonly uniqueStreetName: string
}

type PrimaryStatement =
  | { readonly statementKind: "variable" }
  | { readonly statementKind: "function" }

type SecondaryStatement =
  | { readonly statementKind: "function" }
  | { readonly statementKind: "variable" }

type PrimaryBounds = { readonly lowerBound: number } & { readonly upperBound: number }

type SecondaryBounds = { readonly upperBound: number } & { readonly lowerBound: number }

type PrimaryPair = [string, number]

type SecondaryPair = [string, number]

void ({} as PrimaryAddress)
void ({} as SecondaryAddress)
void ({} as PrimaryStatement)
void ({} as SecondaryStatement)
void ({} as PrimaryBounds)
void ({} as SecondaryBounds)
void ({} as PrimaryPair)
void ({} as SecondaryPair)
