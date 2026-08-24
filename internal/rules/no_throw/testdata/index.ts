export function bad() { throw new Error("bad") }
export const clean = () => new Error("ok");
