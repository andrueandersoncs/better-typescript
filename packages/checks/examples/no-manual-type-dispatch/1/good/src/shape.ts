import { Match, Schema, pipe } from "effect"

class Circle extends Schema.Class<Circle>("Circle")({
  radius: Schema.Number
}) {}
class Square extends Schema.Class<Square>("Square")({ side: Schema.Number }) {}
class Triangle extends Schema.Class<Triangle>("Triangle")({
  base: Schema.Number,
  height: Schema.Number
}) {}

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
