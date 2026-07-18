interface User {
  readonly name: string
  readonly age: number
}

// Valid role contracts.
export const activePredicate = (user: User): boolean => user.age >= 18

export const valueMapper = (user: User): string => user.name

export const totalReducer = (total: number, amount: number): number => total + amount

export const ageComparator = (left: User, right: User): number => left.age - right.age

export const userFactory = (name: string): User => ({ name, age: 0 })

export const clickHandler = (_event: string): void => undefined

export const nameAccessor = (user: User): string => user.name

export const nextFunction = (): (() => number) => () => 1

export const resumeCallback = (): (() => void) => () => undefined

// Ordinary nouns without role suffixes stay quiet.
export const activeUser = (user: User): User => user

export const total = (left: number, right: number): number => left + right

export const click = (_event: string): void => undefined

export const nameOf = (user: User): string => user.name

// Ambiguity guard: words that contain role substrings without claiming the role noun.
export const mappedValue = (user: User): string => user.name

export const factoryReset = (user: User): User => ({ name: user.name, age: 0 })

export class RoleContracts {
  activePredicate(user: User): boolean {
    return user.age >= 18
  }

  nameAccessor(user: User): string {
    return user.name
  }
}
