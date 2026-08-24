interface Customer { readonly id: string }
declare const decode: (input: unknown) => Customer
export const processCustomer = (input: unknown): Customer => decode(input)
