import * as ts from "typescript"

import { roleForFile } from "../../support/roleForFile.js"

import { EffectQualityIndex } from "./effectQualityIndex.js"

export const roleForSourceFile = (index: EffectQualityIndex, sourceFile: ts.SourceFile) =>
  roleForFile(index.roles)(sourceFile)
