import { Array } from "effect"

export const architectureRoles = Array.make<
  ["domain", "port", "application", "adapter", "root", "test"]
>("domain", "port", "application", "adapter", "root", "test")
