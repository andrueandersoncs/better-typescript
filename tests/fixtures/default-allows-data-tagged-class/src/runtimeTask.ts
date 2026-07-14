import { Data, Stream } from "effect"

export class RuntimeTask extends Data.TaggedClass("RuntimeTask")<{
  readonly stream: Stream.Stream<string>
}> {}
