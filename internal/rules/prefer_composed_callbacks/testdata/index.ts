declare const normalize: (value: string) => string;
const values = [1];
export const bad = values.map(value => normalize(String(value)));
export const clean = ["a"].map(value => normalize(value));
declare const update: (previous: number, extra: number) => number;
declare const extra: number;
export const commit = [1].map(previous => update(previous, extra));
