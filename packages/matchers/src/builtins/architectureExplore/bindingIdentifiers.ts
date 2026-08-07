import { Array } from "effect"
import * as ts from "typescript"

export const bindingIdentifiers = (name: ts.BindingName): ReadonlyArray<ts.Identifier> => {
  if (ts.isIdentifier(name)) {
    return Array.of(name)
  }

  const identifiersForElement = (
    element: ts.ArrayBindingElement | ts.BindingElement
  ): ReadonlyArray<ts.Identifier> =>
    ts.isBindingElement(element) ? bindingIdentifiers(element.name) : Array.empty()

  return Array.flatMap(name.elements, identifiersForElement)
}
