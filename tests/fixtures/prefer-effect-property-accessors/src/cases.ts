export const getName = (user: { name: string }) => user.name
export const getAge = (user: { age: number }) => {
  return user.age
}
export function getId(user: { id: number }) {
  return user.id
}
export const accessors = {
  getLabel(item: { label: string }) {
    return item.label
  }
}
export const lookup = (dict: Record<string, number>) => dict.value
export const getKind = function (shape: { kind: string }) {
  return shape.kind
}
