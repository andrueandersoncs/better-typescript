import type * as ts from "typescript"
import type { ProgramContext } from "@better-typescript/matchers/sources/data"

// WorkspaceServices groups retained compiler resources because one finalizer owns their lifetime.
export class WorkspaceServices {
  constructor(
    readonly languageServices: ReadonlyArray<ts.LanguageService>,
    readonly contexts: ReadonlyArray<ProgramContext>
  ) {}
}
