interface Customer { name: string }
type CustomerData = Customer
interface CustomerView extends Customer { label: string }
interface User extends Schema.Schema.Type<typeof UserSchema> {}
type UserDecoded = Schema.Schema.Type<typeof UserSchema>
type BrandedCustomer = Customer & { readonly CustomerBrand: unique symbol }
type CustomerName<T> = keyof T extends never ? never : T[keyof T]

declare namespace Data {
  interface TaggedEnum<Members> { readonly value: Members }
}
type CustomerEvent = Data.TaggedEnum<{ readonly Created: { readonly name: string } }>

type ReadonlyCustomer = Readonly<Customer>
