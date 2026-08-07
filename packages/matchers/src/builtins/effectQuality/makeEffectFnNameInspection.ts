import { Option } from "effect"

import * as ts from "typescript"

import { EffectFnNameInspection } from "./effectFnNameInspection.js"

export const makeEffectFnNameInspection = (name: Option.Option<string>) => (node: ts.Node) =>
  EffectFnNameInspection.make({ node, name })
