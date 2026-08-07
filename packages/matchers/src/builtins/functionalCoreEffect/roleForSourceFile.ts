import type * as ts from "typescript"
import { roleForFile } from "../../support/roleForFile.js"
import type { FunctionalCoreEffectIndex } from "./functionalCoreEffectIndexClass.js"

export const roleForSourceFile = (index: FunctionalCoreEffectIndex, sourceFile: ts.SourceFile) =>
  roleForFile(index.roles)(sourceFile)
