import { Schema } from "effect"
import { WorkspacePolicy } from "../policy/workspacePolicyClass.js"

const workspacePolicyInstanceSchema = Schema.instanceOf(WorkspacePolicy)

export const isWorkspacePolicy = Schema.is(workspacePolicyInstanceSchema)
