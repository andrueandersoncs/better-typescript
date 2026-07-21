import { defined } from "./defined.js"

const local = "local"
export const localAlias = local
export const importedAlias = defined
export const definedHere = "defined"
export const computed = definedHere.toUpperCase()
export let mutableAlias = local
