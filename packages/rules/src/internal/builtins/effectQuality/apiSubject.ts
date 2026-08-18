import { Function, Option, pipe } from "effect"

import * as ts from "typescript"

import type { MatchContext } from "../../scanner/matchContext.js"

import { importedMemberAt } from "../../support/effectApi/importedMemberAt.js"
import { importedMemberSubject } from "../../support/effectApi/importedMemberSubject.js"

export const apiSubject =
  (context: MatchContext) => (fallback: string) => (expression: ts.Expression) =>
    pipe(
      importedMemberAt(context.checker)(expression),
      Option.map(importedMemberSubject),
      Option.getOrElse(Function.constant(fallback))
    )
