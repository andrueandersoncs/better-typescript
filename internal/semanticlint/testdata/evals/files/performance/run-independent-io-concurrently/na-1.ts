type Address = {
  readonly line1: string
  readonly line2?: string
  readonly city: string
  readonly region: string
  readonly postalCode: string
}

export const formatAddress = (address: Address): ReadonlyArray<string> => {
  const locality = [address.city, address.region].filter((part) => part.length > 0).join(", ")
  const postalCode = address.postalCode.toUpperCase()
  const lines = [address.line1, address.line2, locality, postalCode]

  return lines.filter((line) => line !== undefined && line.length > 0)
}
