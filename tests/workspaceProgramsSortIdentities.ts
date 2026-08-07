export const sortIdentities = (identities: ReadonlyArray<string>): ReadonlyArray<string> =>
  [...identities].sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
