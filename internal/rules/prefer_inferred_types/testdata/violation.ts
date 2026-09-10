class Point {}
export const origin: Point = new Point()

export const countSource = (count: number, present: boolean): number => present ? count + 1 : count
