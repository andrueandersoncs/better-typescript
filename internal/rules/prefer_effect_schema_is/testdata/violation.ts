interface Started { readonly _tag: "Started" }
declare const state: Started
const active = state._tag === "Started"
