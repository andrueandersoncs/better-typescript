type Promise<A> = { readonly value: A }

export const wrapped: Promise<string> = { value: "plain" }
