export const getName = (user: { name: string }) => user.name // ~detect 52
export const getAge = (user: { age: number }) => {
  return user.age // ~detect 10
}
export function getId(user: { id: number }) {
  return user.id // ~detect 10
}
export const accessors = {
  getLabel(item: { label: string }) {
    return item.label // ~detect 12
  }
}
export const lookup = (dict: Record<string, number>) => dict.value // ~detect 57
export const getKind = function (shape: { kind: string }) {
  return shape.kind // ~detect 10
}
