interface Customer { name: string }
type CustomerData = Customer
interface CustomerView extends Customer { label: string }
interface User extends Schema.Schema.Type<typeof UserSchema> {}
type UserDecoded = Schema.Schema.Type<typeof UserSchema>
