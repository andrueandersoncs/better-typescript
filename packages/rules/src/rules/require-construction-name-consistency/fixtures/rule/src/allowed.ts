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

type EitherSide<E, A> =
  | {
      readonly _tag: "Left"
      readonly left: E
    }
  | {
      readonly _tag: "Right"
      readonly right: A
    }

declare const users: ReadonlyArray<User>

// Real factories that construct values.
export const makeUser = (name: string): User => ({
  id: name,
  name
})

export const createUser = (name: string): User => ({
  id: name,
  name
})

export const buildUser = (name: string): User => ({
  id: name,
  name
})

export const constructUser = (name: string): User => ({
  id: name,
  name
})

// Bare make and recognized variant constructors are allowed construction names.
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

export const left = <E>(error: E): EitherSide<E, never> => ({
  _tag: "Left",
  left: error
})

export const right = <A>(value: A): EitherSide<never, A> => ({
  _tag: "Right",
  right: value
})

export const of = <A>(value: A): Present<A> => ({
  _tag: "Some",
  value
})

export const succeed = <A>(value: A): Present<A> => ({
  _tag: "Some",
  value
})

export const fail = <E>(error: E): EitherSide<E, never> => ({
  _tag: "Left",
  left: error
})

// Lookup/projection without factory vocabulary — not a construction claim mismatch.
export const findUser = (id: string): User => users.find((user) => user.id === id)!

export const userName = (user: User): string => user.name

// Construction whose name noun does not agree with the result type is left to other naming checks.
export const anonymous = (): User => ({
  id: "anonymous",
  name: "anonymous"
})

export const guest = (): User => ({
  id: "guest",
  name: "guest"
})

// Factory name with construction that happens to use a lookup helper in a branch is still
// construction when every returned expression is a construction; keep pure lookups unmarked.
export const loadUser = (id: string): User => users[0]!

export class UserFactory {
  makeUser(name: string): User {
    return {
      id: name,
      name
    }
  }

  some<A>(value: A): Present<A> {
    return {
      _tag: "Some",
      value
    }
  }
}
