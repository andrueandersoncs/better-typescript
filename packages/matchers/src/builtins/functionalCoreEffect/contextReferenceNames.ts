import { Array } from "effect"
import * as ts from "typescript"
import { declarationInitializesContextApi } from "./declarationInitializesContextApi.js"

const contextReferenceNames = Array.of("Reference")

export const declarationIsContextReference = (
  checker: ts.TypeChecker,
  declaration: ts.Declaration
) => declarationInitializesContextApi(checker, declaration, contextReferenceNames)
