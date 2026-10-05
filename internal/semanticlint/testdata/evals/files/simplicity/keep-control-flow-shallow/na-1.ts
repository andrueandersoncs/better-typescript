export type Point = {
  readonly x: number
  readonly y: number
}

export const translate = (
  points: ReadonlyArray<Point>,
  dx: number,
  dy: number
): ReadonlyArray<Point> =>
  points.map((point) => ({
    x: point.x + dx,
    y: point.y + dy
  }))

export const centroid = (points: ReadonlyArray<Point>): Point => ({
  x: points.reduce((total, point) => total + point.x, 0) / points.length,
  y: points.reduce((total, point) => total + point.y, 0) / points.length
})
