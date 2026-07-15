interface Address {
  readonly streetName: string
}

interface NamedScore {
  readonly name: string
  readonly score: number
}

export const streetName = (address: Address): string => address.streetName
export const streetLength = (address: Address): number => address.streetName.length
export const scoreName = (score: NamedScore): string => score.name
export const scoreValue = (score: NamedScore): number => score.score
