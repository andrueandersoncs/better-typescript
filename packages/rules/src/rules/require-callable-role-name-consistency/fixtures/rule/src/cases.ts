interface User {
  readonly name: string
  readonly age: number
}

// Role suffix claims that do not satisfy their contracts.
export const activePredicate = (user: User): string => user.name // ~detect 14

export const valueMapper = (): number => 1 // ~detect 14

export const totalReducer = (total: number): number => total + 1 // ~detect 14

export const ageComparator = (left: User, right: User): boolean => left.age < right.age // ~detect 14

export const userFactory = (name: string): string => name // ~detect 14

export const clickHandler = (event: string): string => event // ~detect 14

export const nameAccessor = (user: User): string => user.name.toUpperCase() // ~detect 14

export const nextFunction = (): number => 1 // ~detect 14

export const resumeCallback = (): string => "done" // ~detect 14

export function scorePredicate(user: User): number { // ~detect 17
  return user.age
}

export class RoleClaims {
  activePredicate(user: User): string { // ~detect 3
    return user.name
  }

  clickHandler(event: string): string { // ~detect 3
    return event
  }
}
