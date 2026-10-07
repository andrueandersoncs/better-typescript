export type PostalAddress = {
  readonly lineOne: string
  readonly city: string
  readonly postalCode: string
}

const normalizedText = (value: string): string => value.trim()

const normalizedPostalCode = (value: string): string => {
  const trimmedValue = normalizedText(value)

  return trimmedValue.toUpperCase()
}

export const formatPostalAddress = (address: PostalAddress): string => {
  const postalCode = normalizedPostalCode(address.postalCode)

  return `${address.lineOne}, ${address.city} ${postalCode}`
}
