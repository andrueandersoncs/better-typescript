type Address = {
  readonly city: string
  readonly country: string
}

export const addressLabel = (address: Address): string =>
  `${address.city}, ${address.country}`

export const hasCountry = (address: Address, country: string): boolean =>
  address.country === country

export const cityLength = (address: Address): number =>
  address.city.length

export const countryLength = (address: Address): number =>
  address.country.length
