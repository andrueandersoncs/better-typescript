export {}
type Error = { readonly message: string }
const localFailure: Error = { message: "local" }
void localFailure
