import { Array, Schema } from "effect"

// Local role tuple because boundary/shape data share one enum.
const architectureRoles = Array.make<["domain", "port", "application", "adapter", "root", "test"]>(
  "domain",
  "port",
  "application",
  "adapter",
  "root",
  "test"
)

// Schema surface because data modules decode architecture role literals.
export const architectureRoleSchema = Schema.Literals(architectureRoles)
