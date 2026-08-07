import { Array } from "effect"
import { expectedKeys } from "./semanticModulesExpectedKeys.js"

export const expectedModules = Array.map(expectedKeys, (key) => ({
  members: [key],
  forestBondKeys: []
}))
