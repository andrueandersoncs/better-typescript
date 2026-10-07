import { expect, test } from "vitest"

const priceWithTax = (price: number, rate: number) => price + price * rate

test("calculates tax for a basket item", () => {
  expect(priceWithTax(25, 0.2)).toBe(30)
})

test("keeps zero-priced items free", () => {
  expect(priceWithTax(0, 0.2)).toBe(0)
})

test("supports a reduced rate", () => {
  expect(priceWithTax(40, 0.05)).toBe(42)
})
