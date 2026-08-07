import { Array } from "effect"

// Role literals stay closed beside the table because classifiers share this vocabulary.
export const architectureRoles = Array.make<
  ["domain", "port", "application", "adapter", "root", "test"]
>("domain", "port", "application", "adapter", "root", "test")
