package no_mutable_array_methods

import (
	"fmt"
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

const help = "This is a sign that you're doing something fundamentally procedural when you should be taking a more functional approach. Use Effect's Array module, such as Array.append(), Array.map(), Array.filter(), Array.sort(), or spread syntax instead of manipulating an array in place."

var mutable = map[string]bool{"copyWithin": true, "fill": true, "pop": true, "push": true, "reverse": true, "shift": true, "sort": true, "splice": true, "unshift": true}
var Rule = rule.Rule{Name: "no-mutable-array-methods", Run: run}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		callee := node.AsCallExpression().Expression
		if callee.Kind != ast.KindPropertyAccessExpression {
			return
		}
		access := callee.AsPropertyAccessExpression()
		name := access.Name().Text()
		if !mutable[name] || !ctx.TypeChecker.IsArrayLikeType(ctx.TypeChecker.GetTypeAtLocation(access.Expression)) {
			return
		}
		ctx.ReportNode(node, rule.RuleMessage{Id: "no-mutable-array-methods", Description: fmt.Sprintf("Avoid mutating arrays with Array.prototype.%s().", name), Help: help})
	}}
}
