import { Data, Stream } from "effect"

// RuntimeTask is one task identity because the executor and observer evolve independently.
export class RuntimeTask extends Data.TaggedClass("RuntimeTask")<{
  readonly stream: Stream.Stream<string>
}> {}
