import { Data, Stream } from "effect"

/**
 * RuntimeTask carries the non-serializable stream shared by execution and observation.
 *
 * @modelRole shared
 * @remarks Exists because the executor and observer evolve independently but must use
 * one stable task identity. Removing it would duplicate the stream contract across both
 * owners and allow their runtime representations to drift.
 */
export class RuntimeTask extends Data.TaggedClass("RuntimeTask")<{
  readonly stream: Stream.Stream<string>
}> {}
