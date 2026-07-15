const state = { count: 0 }

export const incrementEightTimes = (): number => {
  state.count += 1
  state.count += 1
  state.count += 1
  state.count += 1
  state.count += 1
  state.count += 1
  state.count += 1
  state.count += 1

  return state.count
}
