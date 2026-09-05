import { Channel, Stream } from "effect"

const source = Stream.make(1)
Stream.buffer(source, { capacity: 0, strategy: "suspend" })
Stream.bufferArray(source, { capacity: 16, strategy: "sliding" })
Channel.buffer({ capacity: 8 })
{
  const Infinity = 1
  Stream.buffer(source, { capacity: Infinity })
}
{
  const Stream = { buffer: <A>(value: A, options: { readonly capacity: string }) => value }
  Stream.buffer(source, { capacity: "unbounded" })
}
