export function bad(condition: boolean) { if (condition) return "yes"; return "no" }
export const clean = (condition: boolean) => condition ? "yes" : "no";
