export {}
type Error = { readonly message: string }
export const localFailure: Error = { message: "local" }
export const builtInErrorValue = new globalThis.Error("runtime value")
export const builtInErrorConstructor: ErrorConstructor = globalThis.Error
