interface User {
  readonly name: string
  readonly age: number
}

export const activePredicate = (user: User): string => user.name

export const valueMapper = (): number => 1

export const totalReducer = (total: number): number => total + 1

export const ageComparator = (left: User, right: User): boolean => left.age < right.age

export const userFactory = (name: string): string => name

export const clickHandler = (event: string): string => event

export const nameAccessor = (user: User): string => user.name.toUpperCase()

export const nextFunction = (): number => 1

export const resumeCallback = (): string => "done"
