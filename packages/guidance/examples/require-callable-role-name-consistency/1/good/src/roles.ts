interface User {
  readonly name: string
  readonly age: number
}

export const activePredicate = (user: User): boolean => user.age >= 18

export const valueMapper = (user: User): string => user.name

export const totalReducer = (total: number, amount: number): number => total + amount

export const ageComparator = (left: User, right: User): number => left.age - right.age

export const userFactory = (name: string): User => ({ name, age: 0 })

export const clickHandler = (_event: string): void => undefined

export const nameAccessor = (user: User): string => user.name

export const nextFunction = (): (() => number) => () => 1

export const resumeCallback = (): (() => void) => () => undefined
