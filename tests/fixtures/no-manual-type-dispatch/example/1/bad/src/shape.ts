import { Schema } from "effect"

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

export const area = (shape: Circle | Square | Triangle) => {
  if (Schema.is(Circle)(shape)) {
    return circleArea(shape)
  }
  if (Schema.is(Square)(shape)) {
    return squareArea(shape)
  }
  if (Schema.is(Triangle)(shape)) {
    return triangleArea(shape)
  }
}
