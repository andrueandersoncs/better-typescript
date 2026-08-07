import { Option, pipe } from "effect"
import * as ts from "typescript"
import { variableDeclarationInitializer } from "../../support/variableDeclarationInitializer.js"
import { callConstructsContextApi } from "./callConstructsContextApi.js"

export const declarationInitializesContextApi = (
  checker: ts.TypeChecker,
  declaration: ts.Declaration,
  names: ReadonlyArray<string>
) => {
  const callConstructsContextApiOf = (initializer: ts.Expression) =>
    callConstructsContextApi(checker, initializer, names)

  return pipe(
    Option.liftPredicate(ts.isVariableDeclaration)(declaration),
    Option.flatMap(variableDeclarationInitializer),
    Option.exists(callConstructsContextApiOf)
  )
}
