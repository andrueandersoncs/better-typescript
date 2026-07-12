import { Data } from "effect"

export class MyEvent extends Data.TaggedClass("MyEvent")<{
  readonly payload: string
}> {}
