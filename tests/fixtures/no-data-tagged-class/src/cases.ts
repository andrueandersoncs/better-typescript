import { Data } from "effect"

// Case 1: Data.TaggedClass with a simple tag
export class MyEvent extends Data.TaggedClass("MyEvent")<{
  readonly payload: string
}> {}

// Case 2: Data.TaggedClass with multiple fields
export class UserCreated extends Data.TaggedClass("UserCreated")<{
  readonly userId: string
  readonly name: string
}> {}
