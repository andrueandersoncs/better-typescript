import { Option } from "effect"

import * as ts from "typescript"

import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"
import { unwrapCallee } from "../../support/unwrapCallee.js"

import { importedMemberAt } from "../functionalCoreEffect/importedMemberAt.js"

import type { ImportedMember } from "../functionalCoreEffect/importedMember.js"

export const callIsImportedApi =
  (predicate: (member: ImportedMember) => boolean) =>
  (checker: ts.TypeChecker) =>
  (expression: ts.Expression) => {
    const unwrapped = unwrapTransparentExpression(expression)
    const callee = unwrapCallee(unwrapped)
    const member = importedMemberAt(checker, callee)

    return Option.exists(member, predicate)
  }
