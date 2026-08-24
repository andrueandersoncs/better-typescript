declare const normalize: (value: string) => string;
const values = [1];
export const bad = values.map(value => normalize(String(value)));
export const clean = ["a"].map(value => normalize(value));
