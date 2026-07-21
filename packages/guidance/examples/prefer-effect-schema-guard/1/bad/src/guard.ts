export const readName = (value: object) => {
  if ("name" in value) {
    return value.name
  }
}
