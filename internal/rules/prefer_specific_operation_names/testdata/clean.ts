interface Customer { readonly id: string }
declare const decode: (input: unknown) => Customer
export const decodeCustomer = (input: unknown): Customer => decode(input)
