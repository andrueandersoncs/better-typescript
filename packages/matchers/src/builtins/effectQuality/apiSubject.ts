import { Function, Option, pipe } from "effect"

import * as ts from "typescript"

import type { MatchContext } from "../../matcher/matchContext.js"

import { importedMemberAt } from "../functionalCoreEffect/importedMemberAt.js"
import { importedMemberSubject } from "../functionalCoreEffect/importedMemberSubject.js"

export const apiSubject =
  (context: MatchContext) => (fallback: string) => (expression: ts.Expression) =>
    pipe(
      importedMemberAt(context.checker, expression),
      Option.map(importedMemberSubject),
      Option.getOrElse(Function.constant(fallback))
    )
