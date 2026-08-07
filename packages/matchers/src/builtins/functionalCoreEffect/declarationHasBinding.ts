import { Option, flow } from "effect"
import { bindingFromDeclaration } from "./bindingFromDeclaration.js"

export const declarationHasBinding = flow(bindingFromDeclaration, Option.isSome)
