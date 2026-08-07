import { flow, Struct } from "effect"

import * as ts from "typescript"

import { toRelativeFileName } from "../../support/paths.js"

import { EffectQualityIndex } from "./effectQualityIndex.js"

export const relativeSourcePath = (index: EffectQualityIndex) =>
  flow(Struct.get<ts.SourceFile, "fileName">("fileName"), toRelativeFileName(index.projectRoot))
