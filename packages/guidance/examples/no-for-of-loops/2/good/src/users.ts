import { Stream } from "effect"

declare const users: AsyncIterable<{ readonly name: string }>

export const names = Stream.fromAsyncIterable(users, (error) => error).pipe(
  Stream.map((user) => user.name),
  Stream.runCollect
)
