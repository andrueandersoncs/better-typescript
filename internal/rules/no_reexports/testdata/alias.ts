import { item } from "./dependency";
import * as dependency from "./dependency";
const made = item;
const member = dependency.item;
export { made, member };
export const wrapped = { value: dependency.item };
const local = 1;
export { local };
