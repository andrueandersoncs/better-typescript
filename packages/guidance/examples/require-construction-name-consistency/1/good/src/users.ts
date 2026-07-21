interface User {
  readonly id: string
  readonly name: string
}

interface Absent {
  readonly _tag: "None"
}

type Present<A> =
  | Absent
  | {
      readonly _tag: "Some"
      readonly value: A
    }

declare const users: ReadonlyArray<User>

export const makeUser = (name: string): User => ({
  id: name,
  name
})

export const make = (name: string): User => ({
  id: name,
  name
})

export const some = <A>(value: A): Present<A> => ({
  _tag: "Some",
  value
})

export const none = (): Present<never> => ({
  _tag: "None"
})

export const findUser = (id: string): User => users.find((user) => user.id === id)!
