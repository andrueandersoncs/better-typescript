package no_eager_node_runtime_access

import (
	"testing"

	"github.com/andrueandersoncs/better-typescript/internal/analysis"
	"github.com/andrueandersoncs/better-typescript/internal/ruletest"
)

func TestRule(t *testing.T) {
	ruletest.Assert(t, "testdata/project", Rule, []analysis.Violation{
		{RuleName: "no-eager-node-runtime-access", Level: "error", Message: "Avoid Node runtime access during module initialization. Defer the call inside an Effect. Pass the result directly; use a service or Layer only when the value must be shared or replaced in tests.", FilePath: "src/aliases.ts", Line: 6, Column: 16},
		{RuleName: "no-eager-node-runtime-access", Level: "error", Message: "Avoid Node runtime access during module initialization. Defer the call inside an Effect. Pass the result directly; use a service or Layer only when the value must be shared or replaced in tests.", FilePath: "src/aliases.ts", Line: 7, Column: 24},
		{RuleName: "no-eager-node-runtime-access", Level: "error", Message: "Avoid Node runtime access during module initialization. Defer the call inside an Effect. Pass the result directly; use a service or Layer only when the value must be shared or replaced in tests.", FilePath: "src/aliases.ts", Line: 8, Column: 22},
		{RuleName: "no-eager-node-runtime-access", Level: "error", Message: "Avoid Node runtime access during module initialization. Defer the call inside an Effect. Pass the result directly; use a service or Layer only when the value must be shared or replaced in tests.", FilePath: "src/aliases.ts", Line: 9, Column: 19},
		{RuleName: "no-eager-node-runtime-access", Level: "error", Message: "Avoid Node runtime access during module initialization. Defer the call inside an Effect. Pass the result directly; use a service or Layer only when the value must be shared or replaced in tests.", FilePath: "src/cases.ts", Line: 5, Column: 34},
		{RuleName: "no-eager-node-runtime-access", Level: "error", Message: "Avoid Node runtime access during module initialization. Defer the call inside an Effect. Pass the result directly; use a service or Layer only when the value must be shared or replaced in tests.", FilePath: "src/cases.ts", Line: 6, Column: 18},
		{RuleName: "no-eager-node-runtime-access", Level: "error", Message: "Avoid Node runtime access during module initialization. Defer the call inside an Effect. Pass the result directly; use a service or Layer only when the value must be shared or replaced in tests.", FilePath: "src/cases.ts", Line: 7, Column: 19},
		{RuleName: "no-eager-node-runtime-access", Level: "error", Message: "Avoid Node runtime access during module initialization. Defer the call inside an Effect. Pass the result directly; use a service or Layer only when the value must be shared or replaced in tests.", FilePath: "src/eager-boundaries.ts", Line: 4, Column: 32},
		{RuleName: "no-eager-node-runtime-access", Level: "error", Message: "Avoid Node runtime access during module initialization. Defer the call inside an Effect. Pass the result directly; use a service or Layer only when the value must be shared or replaced in tests.", FilePath: "src/eager-boundaries.ts", Line: 7, Column: 30},
		{RuleName: "no-eager-node-runtime-access", Level: "error", Message: "Avoid Node runtime access during module initialization. Defer the call inside an Effect. Pass the result directly; use a service or Layer only when the value must be shared or replaced in tests.", FilePath: "src/eager-boundaries.ts", Line: 10, Column: 5},
		{RuleName: "no-eager-node-runtime-access", Level: "error", Message: "Avoid Node runtime access during module initialization. Defer the call inside an Effect. Pass the result directly; use a service or Layer only when the value must be shared or replaced in tests.", FilePath: "src/eager-boundaries.ts", Line: 13, Column: 4},
		{RuleName: "no-eager-node-runtime-access", Level: "error", Message: "Avoid Node runtime access during module initialization. Defer the call inside an Effect. Pass the result directly; use a service or Layer only when the value must be shared or replaced in tests.", FilePath: "src/eager-boundaries.ts", Line: 14, Column: 4},
		{RuleName: "no-eager-node-runtime-access", Level: "error", Message: "Avoid Node runtime access during module initialization. Defer the call inside an Effect. Pass the result directly; use a service or Layer only when the value must be shared or replaced in tests.", FilePath: "src/eager-boundaries.ts", Line: 22, Column: 13},
		{RuleName: "no-eager-node-runtime-access", Level: "error", Message: "Avoid Node runtime access during module initialization. Defer the call inside an Effect. Pass the result directly; use a service or Layer only when the value must be shared or replaced in tests.", FilePath: "src/eager-boundaries.ts", Line: 25, Column: 13},
	})
}
