package no_property_access_after_call

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "no-property-access-after-call",
	Description: "Avoid accessing a property directly after a function call.",
	Help:        "Store the call result in a const before accessing its property. Chained function calls are allowed.",
}

var Rule = rule.Rule{Name: "no-property-access-after-call", Run: run}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindPropertyAccessExpression: func(node *ast.Node) {
		access := node.AsPropertyAccessExpression()
		if !ast.IsCallExpression(access.Expression) {
			return
		}
		if parent := node.Parent; parent != nil && ast.IsCallExpression(parent) && parent.AsCallExpression().Expression == node {
			return
		}
		ctx.ReportNode(access.Name(), message)
	}}
}
