interface Counter { count: number }
const counter: Counter = { count: 0 }
counter.count = 1
const clean: Counter = { ...counter, count: 2 }
void clean
Object.assign(counter, { count: 3 })
Reflect.set(counter, "count", 4)
Object.defineProperty(counter, "count", { value: 5 })
const merged = Object.assign({}, counter, { count: 6 })
void merged
const date = new Date(0)
date.setFullYear(2000)
const year = date.getFullYear()
void year
export const label = (element: HTMLElement, items: readonly string[]): void => {
  element.textContent = "label"
  for (element of [element]) void element
  void items
}
document.title = "boundary"
