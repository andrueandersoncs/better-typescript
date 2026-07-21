interface PrimaryAddress {
  readonly streetName: string
}

interface SecondaryAddress {
  readonly streetName: string
}

type PrimaryPair = readonly [string, number]
type SecondaryPair = readonly [string, number]

declare const primaryAddress: PrimaryAddress
declare const secondaryAddress: SecondaryAddress
declare const primaryPair: PrimaryPair
declare const secondaryPair: SecondaryPair

export const primaryStreet = primaryAddress.streetName
export const secondaryStreet = secondaryAddress.streetName
export const primaryName = primaryPair[0]
export const secondaryName = secondaryPair[0]
