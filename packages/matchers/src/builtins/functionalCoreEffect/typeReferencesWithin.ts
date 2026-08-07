import { Array, Function } from "effect"
import * as ts from "typescript"
import { foldAst } from "../../sources/foldAst.js"
import { emptyTypeReferences } from "./emptyTypeReferences.js"

const appendTypeReference = (
  references: ReadonlyArray<ts.TypeReferenceNode>,
  current: ts.Node
): ReadonlyArray<ts.TypeReferenceNode> =>
  ts.isTypeReferenceNode(current) ? Array.append(references, current) : references

export const typeReferencesWithin = Function.flip(foldAst(appendTypeReference))(emptyTypeReferences)
