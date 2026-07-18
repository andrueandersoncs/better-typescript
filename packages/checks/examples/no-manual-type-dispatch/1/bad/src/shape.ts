import { Schema } from "effect"

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
