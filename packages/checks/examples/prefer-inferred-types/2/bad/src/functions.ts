export {}

export const double = (value: number): number => value * 2

class User {
  constructor(readonly id: number) {}
}

export const createUser = (id: number): User => new User(id)
