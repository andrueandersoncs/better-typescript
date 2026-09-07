import { runCollect as collectAll } from "effect/Stream"
import { Channel, Effect, pipe, Sink, Stream, Stream as S } from "effect"

const next = Effect.succeed(1)
const source = Stream.fromEffectRepeat(next)
declare const channel: Channel.Channel<number>

Stream.runCollect(source)
source.pipe(Stream.runCollect)
Stream.run(source, Sink.collect())
source.pipe(Stream.collect, Stream.take(1))
source.pipe(Stream.run(Sink.collect()))
Stream.collect(source)
Channel.runCollect(channel)
source.pipe(Stream.collect, Stream.flatMap(() => source), Stream.runCollect)
S.runCollect(source)
collectAll(source)

declare const limit: number
source.pipe(Stream.take(limit), Stream.runCollect)

function collectLimited(limit: number) {
  return pipe(source, Stream.take(limit), Stream.runCollect)
}
collectLimited(16)
