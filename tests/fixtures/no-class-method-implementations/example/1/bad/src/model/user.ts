import { Schema } from "effect"

export class User extends Schema.Class<User>("User")({
  name: Schema.String
}) {
  greet(): string { return `Hello, ${this.name}` }
}
