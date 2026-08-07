import { CallableSemantics } from "./callableSemanticsClass.js"

export const isNonBooleanResult = (semantics: CallableSemantics) =>
  semantics.result.shape !== "boolean"
