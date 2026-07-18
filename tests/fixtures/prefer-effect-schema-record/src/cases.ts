import { Option } from "effect"

// 1. Direct annotated construction
export interface User { // ~detect 18
  readonly id: number
  readonly name: string
}
export const currentUser: User = { id: 1, name: "Ada" }

// 2. Return-type contextual construction
export interface Point { // ~detect 18
  readonly x: number
  readonly y: number
}
export const origin = (): Point => ({ x: 0, y: 0 })

// 3. Array-element construction
export interface Tag { // ~detect 18
  readonly label: string
}
export const tags: ReadonlyArray<Tag> = [{ label: "a" }]

// 4. Effect-boxed construction
export interface Account { // ~detect 18
  readonly balance: number
}
export const maybeAccount: Option.Option<Account> = Option.some({
  balance: 100
})

// 5. Union contextual type — only the shape-matching member is flagged
export interface Nil {
  readonly _tag: "Nil"
}
export interface Cons { // ~detect 18
  readonly _tag: "Cons"
  readonly head: number
}
export const node: Nil | Cons = { _tag: "Cons", head: 1 }

// 6. Type alias with object literal body, constructed
export type Settings = { readonly verbose: boolean } // ~detect 13
export const settings: Settings = { verbose: true }

// 7. Tuple type alias
export type ExampleTuple = [string, number] // ~detect 13
export const exampleTuple: ExampleTuple = ["Ada", 36]

// 8. Readonly named tuple type alias
export type ReadonlyExampleTuple = readonly [ // ~detect 13
  myString: string,
  myNumber: number
]
export const readonlyExampleTuple: ReadonlyExampleTuple = ["Grace", 37]
