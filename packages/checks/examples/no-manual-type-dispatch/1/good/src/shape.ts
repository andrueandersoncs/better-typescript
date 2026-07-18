import { Match, Schema, pipe } from "effect"

const Circle = Schema.Struct({
  radius: Schema.Number
})
interface Circle extends Schema.Schema.Type<typeof Circle> {}
const Square = Schema.Struct({ side: Schema.Number })
interface Square extends Schema.Schema.Type<typeof Square> {}
const Triangle = Schema.Struct({
  base: Schema.Number,
  height: Schema.Number
})
interface Triangle extends Schema.Schema.Type<typeof Triangle> {}

declare const circleArea: (circle: Circle) => number
declare const squareArea: (square: Square) => number
declare const triangleArea: (triangle: Triangle) => number

const isCircle = Schema.is(Circle)
const isSquare = Schema.is(Square)
const isTriangle = Schema.is(Triangle)

export const area = (shape: Circle | Square | Triangle) =>
  pipe(
    Match.value(shape),
    Match.when(isCircle, circleArea),
    Match.when(isSquare, squareArea),
    Match.when(isTriangle, triangleArea),
    Match.exhaustive
  )
