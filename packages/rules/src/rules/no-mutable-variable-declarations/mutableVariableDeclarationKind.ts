import { Array, Schema } from "effect"

const mutableVariableDeclarationKinds = Array.make<["let", "var"]>("let", "var")

// MutableVariableDeclarationKind exists because its fields form one stable data contract used by the linter.
export const MutableVariableDeclarationKind = Schema.Literals(mutableVariableDeclarationKinds)

export type MutableVariableDeclarationKind = typeof MutableVariableDeclarationKind.Type

export { mutableVariableDeclarationKinds }
