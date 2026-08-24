package no_switch_statements

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

var Rule = rule.Rule{
	Name: "no-switch-statements",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		return rule.RuleListeners{ast.KindSwitchStatement: func(node *ast.Node) {
			ctx.ReportNode(node, rule.RuleMessage{Id: "no-switch-statements", Description: "Avoid switch statements.", Help: "Use Effect's Match module for pattern matching, and prefer Match.exhaustive so every case is handled explicitly."})
		}}
	},
}
