import { Array, Schema } from "effect"

const mutableVariableDeclarationKinds = Array.make<["let", "var"]>("let", "var")

// MutableVariableDeclarationKind classifies let/var because declaration advice differs.
export const MutableVariableDeclarationKind = Schema.Literals(mutableVariableDeclarationKinds)

export type MutableVariableDeclarationKind = typeof MutableVariableDeclarationKind.Type

export { mutableVariableDeclarationKinds }
