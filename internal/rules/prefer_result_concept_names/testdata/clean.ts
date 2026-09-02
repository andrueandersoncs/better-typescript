interface Customer { readonly name: string }
export const customerName = (customer: Customer): string => customer.name
export const fieldIsReserved = (customer: Customer): boolean => customer.name === "id"
