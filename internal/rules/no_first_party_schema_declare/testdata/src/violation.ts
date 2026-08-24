declare const Schema: { declare: (predicate: unknown) => unknown }
interface User { readonly name: string }
const isUser = (input: unknown): input is User => typeof input === "object"
export const UserSchema = Schema.declare(isUser)
