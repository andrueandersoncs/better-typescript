package no_inline_boolean_expressions

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "no-inline-boolean-expressions",
	Description: "Avoid boolean operators inline in an if statement condition.",
	Help:        "Extract the expression into a well-named const variable declaration above the if statement and use that variable in the if condition.",
}

var Rule = rule.Rule{Name: "no-inline-boolean-expressions", Run: run}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindIfStatement: func(node *ast.Node) {
		expression := unwrap(node.AsIfStatement().Expression)
		if expression.Kind != ast.KindBinaryExpression {
			return
		}
		operator := expression.AsBinaryExpression().OperatorToken.Kind
		if operator == ast.KindAmpersandAmpersandToken || operator == ast.KindBarBarToken {
			ctx.ReportNode(expression, message)
		}
	}}
}

func unwrap(node *ast.Node) *ast.Node {
	for node != nil && (node.Kind == ast.KindParenthesizedExpression) {
		node = node.Expression()
	}
	return node
}
