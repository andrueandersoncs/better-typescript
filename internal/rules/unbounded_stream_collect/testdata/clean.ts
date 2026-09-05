import { Channel, Effect, Stream } from "effect"

const source = Stream.fromEffectRepeat(Effect.succeed(1))
const finite = Stream.make(1, 2, 3)
Stream.runCollect(finite)
Stream.runCollect(Stream.empty)
Stream.runCollect(Stream.take(source, 10))
source.pipe(Stream.take(10), Stream.runCollect)
Channel.runCollect(Channel.fromIterable([1, 2, 3]))
Stream.runDrain(source)

{
  const Stream = { runCollect: <A>(value: A) => value }
  Stream.runCollect(source)
}