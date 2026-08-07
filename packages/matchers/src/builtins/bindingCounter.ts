import { Data, MutableRef } from "effect"
import * as ts from "typescript"

// BindingCounter uses explicit mutable cells because one hot AST pass updates every imported name.
export class BindingCounter extends Data.Class<{
  readonly binding: ts.Identifier
  readonly importStart: number
  readonly importEnd: number
  readonly isNamespace: boolean
  readonly referenceCount: MutableRef.MutableRef<number>
  readonly callCount: MutableRef.MutableRef<number>
}> {}
