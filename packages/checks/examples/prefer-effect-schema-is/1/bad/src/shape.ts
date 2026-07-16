interface Circle {
  readonly _tag: "Circle"
  readonly radius: number
}

interface Square {
  readonly _tag: "Square"
  readonly side: number
}

declare const circleArea: (circle: Circle) => number

export const area = (shape: Circle | Square) => {
  if (shape._tag === "Circle") {
    return circleArea(shape)
  }
}
