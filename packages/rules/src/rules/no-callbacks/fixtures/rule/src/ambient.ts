export {}

// Ambient const with a callback-style FunctionType annotation: previously fired,
// now skipped because declare statements mirror external reality.
declare const subscribe: (handler: (value: string) => void) => void

// Ambient function declaration with a callback parameter and void return.
declare function onTick(cb: () => void): void

void subscribe
void onTick
