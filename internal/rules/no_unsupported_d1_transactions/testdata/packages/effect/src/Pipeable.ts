export interface Pipeable {
  pipe<A>(this: A): A
  pipe<A, B>(this: A, ab: (a: A) => B): B
}
