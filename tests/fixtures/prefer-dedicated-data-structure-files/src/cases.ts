import { Data, Schema } from "effect"

export class User extends Schema.Class<User>("User")({
  name: Schema.String,
  age: Schema.Number
}) {}

export const renameUser = (name: string, user: User): User =>
  User.make({ ...user, name })

export interface Organization {
  readonly id: string
  readonly title: string
}

export const renameOrganization = (
  title: string,
  organization: Organization
): Organization => ({
  ...organization,
  title
})

export type Point = {
  readonly x: number
  readonly y: number
}

export const movePoint = (dx: number, dy: number, point: Point): Point => ({
  x: point.x + dx,
  y: point.y + dy
})

export class Score extends Data.Class<{
  readonly value: number
}> {}

export const bumpScore = (amount: number, score: Score): Score =>
  new Score({ value: score.value + amount })
