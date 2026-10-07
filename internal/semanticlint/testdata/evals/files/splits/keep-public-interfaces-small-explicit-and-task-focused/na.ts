export type Address = Readonly<{
  lineOne: string
  city: string
  postalCode: string
}>

export type Contact = Readonly<{
  name: string
  email: string
}>

export type DeliveryDestination = Readonly<{
  contact: Contact
  address: Address
}>

export type DeliveryMethod = "courier" | "pickup"
