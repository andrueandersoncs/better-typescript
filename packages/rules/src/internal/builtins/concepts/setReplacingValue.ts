import { HashMap, pipe } from "effect"

export const setReplacingValue =
  <Key>(key: Key) =>
  <Value>(index: HashMap.HashMap<Key, Value>) =>
  (value: Value): HashMap.HashMap<Key, Value> =>
    pipe(index, HashMap.remove(key), HashMap.set(key, value))
