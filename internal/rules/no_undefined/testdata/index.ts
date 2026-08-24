declare const value: number | undefined;
export const bad = value === undefined;
export const clean = value === 0;
export function returnNothing(): void { return; }
