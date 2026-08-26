import { Schema } from "effect"

export const UserSchema = Schema.Struct({ name: Schema.String })
export interface User extends Schema.Schema.Type<typeof UserSchema> {}
declare const MissingIso: Omit<Schema.Schema<string>, "Iso">
declare const MissingMakeInput: Omit<Schema.Schema<string>, "~type.make.in">
const callback = ({ Parameter }: { Parameter: Schema.Schema<string> }) => Parameter
void MissingIso
void MissingMakeInput
void callback
