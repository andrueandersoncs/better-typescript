import { Schema } from "effect"

export class AllowedUser extends Schema.Class<AllowedUser>("AllowedUser")({
  name: Schema.String
}) {}

export interface AllowedOrganization {
  readonly id: string
  readonly title: string
}

export type AllowedPoint = {
  readonly x: number
  readonly y: number
}
