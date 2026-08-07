import { Option, pipe } from "effect"

import * as ts from "typescript"

import { EffectQualityIndex } from "./effectQualityIndex.js"

import { isAdapterRole } from "./isAdapterRole.js"

import { roleForSourceFile } from "./roleForSourceFile.js"

export const sourceHasAdapterRole = (index: EffectQualityIndex) => (sourceFile: ts.SourceFile) =>
  pipe(roleForSourceFile(index, sourceFile), Option.exists(isAdapterRole))
