type Address = {
  readonly city: string
  readonly country: string
}

export const formatAddress = (address: Address): string => {
  return `${address.city}, ${address.country}`
}
