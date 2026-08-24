package no_new_error

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{Id: "no-new-error", Description: "Avoid using new Error() directly.", Help: "Declare a custom error with Effect Schema.TaggedErrorClass, then use new CustomError() instead of bare new Error()."}
var Rule = rule.Rule{Name: "no-new-error", Run: run}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindNewExpression: func(node *ast.Node) {
		expression := node.AsNewExpression().Expression
		if ast.IsIdentifier(expression) && expression.Text() == "Error" {
			ctx.ReportNode(node, message)
		}
	}}
}
