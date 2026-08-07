import { HashMap, pipe } from "effect"

export const setReplacingValue = <Key, Value>(
  index: HashMap.HashMap<Key, Value>,
  key: Key,
  value: Value
): HashMap.HashMap<Key, Value> => pipe(index, HashMap.remove(key), HashMap.set(key, value))
