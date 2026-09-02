import { Schema } from "effect"

export const ActionSchema = Schema.Struct({ outcome: Schema.String })
export interface Action extends Schema.Schema.Type<typeof ActionSchema> {}

export const ProjectSchema = Schema.Struct({ outcome: Schema.String })
export interface Project extends Schema.Schema.Type<typeof ProjectSchema> {}

export const applyInit = (action: Action): Project => ProjectSchema.make({ outcome: action.outcome })
