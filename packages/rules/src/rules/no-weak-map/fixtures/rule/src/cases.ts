export {}

const plansByProgram = new WeakMap<object, ReadonlyArray<string>>() // ~detect 28

const declaredCache: WeakMap<object, number> | undefined = undefined // ~detect 22

{
  const localCache = new WeakMap<object, boolean>() // ~detect 26

  void localCache
}

type BuiltInCache = WeakMap<object, Date> // ~detect 21

const builtInConstructor = WeakMap // ~detect 28

void plansByProgram
void declaredCache
void builtInConstructor
