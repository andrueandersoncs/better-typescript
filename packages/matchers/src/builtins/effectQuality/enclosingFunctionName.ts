import { Option, pipe, Struct } from "effect"

import * as ts from "typescript"

import { propertyNameText } from "../../support/propertyNameText.js"

import { enclosingFunctionLike } from "../functionalCoreEffect/enclosingFunctionLike.js"

import { declarationNameText } from "./declarationNameText.js"

export const enclosingFunctionName = (node: ts.Node) =>
  pipe(
    enclosingFunctionLike(node),
    Option.flatMap((declaration) => {
      const direct = declarationNameText(declaration)

      if (Option.isSome(direct)) {
        return direct
      }

      return pipe(
        Option.fromNullishOr(declaration.parent),
        Option.flatMap((parent) => {
          const variableName = pipe(
            Option.some(parent),
            Option.filter(ts.isVariableDeclaration),
            Option.map(Struct.get("name")),
            Option.filter(ts.isIdentifier),
            Option.map(Struct.get("text"))
          )

          if (Option.isSome(variableName)) {
            return variableName
          }

          return pipe(
            Option.some(parent),
            Option.filter(ts.isPropertyAssignment),
            Option.map(Struct.get("name")),
            Option.flatMap(propertyNameText)
          )
        })
      )
    })
  )
