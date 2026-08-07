import { flow, Struct } from "effect"

import * as ts from "typescript"

import { strictEqual } from "@better-typescript/matchers/equivalence"

export const identifierTextIsIt = flow(Struct.get<ts.Identifier, "text">("text"), strictEqual("it"))
