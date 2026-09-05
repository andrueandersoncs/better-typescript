export function value(): number { return 1 }
export const outer = function() { return function inner(this: { readonly value: unknown }) { return this } }
export const destructures = function() { const { arguments: local } = { arguments: 1 }; return local }
