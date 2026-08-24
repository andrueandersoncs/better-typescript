package no_multiple_boolean_operators

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

var message = rule.RuleMessage{Id: "no-multiple-boolean-operators", Description: "Avoid combining more than one boolean operator in a single expression.", Help: "Declare multiple constant variables instead of combining operators into a single expression."}
var Rule = rule.Rule{Name: "no-multiple-boolean-operators", Run: run}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	check := func(node *ast.Node) {
		if isBooleanOperator(node) && !hasBooleanAncestor(node) && booleanCount(node) > 1 {
			ctx.ReportNode(node, message)
		}
	}
	return rule.RuleListeners{ast.KindBinaryExpression: check, ast.KindPrefixUnaryExpression: check, ast.KindConditionalExpression: check}
}
func isBooleanOperator(node *ast.Node) bool {
	switch node.Kind {
	case ast.KindConditionalExpression:
		return true
	case ast.KindPrefixUnaryExpression:
		return node.AsPrefixUnaryExpression().Operator == ast.KindExclamationToken
	case ast.KindBinaryExpression:
		switch node.AsBinaryExpression().OperatorToken.Kind {
		case ast.KindAmpersandAmpersandToken, ast.KindBarBarToken, ast.KindEqualsEqualsEqualsToken, ast.KindExclamationEqualsEqualsToken:
			return true
		}
	}
	return false
}
func booleanCount(node *ast.Node) int {
	node = unwrap(node)
	count := 0
	if isBooleanOperator(node) {
		count++
	}
	switch node.Kind {
	case ast.KindArrowFunction, ast.KindFunctionExpression, ast.KindClassExpression:
		return count
	}
	if node.Kind == ast.KindConditionalExpression {
		expression := node.AsConditionalExpression()
		return count + booleanCount(expression.WhenTrue) + booleanCount(expression.WhenFalse)
	}
	node.ForEachChild(func(child *ast.Node) bool {
		if ast.IsExpression(child) {
			count += booleanCount(child)
		}
		return false
	})
	return count
}
func hasBooleanAncestor(node *ast.Node) bool {
	parent := node.Parent
	if parent == nil {
		return false
	}
	if parent.Kind == ast.KindConditionalExpression && parent.AsConditionalExpression().Condition == node {
		return false
	}
	return isBooleanOperator(parent) || hasBooleanAncestor(parent)
}
func unwrap(node *ast.Node) *ast.Node {
	for node != nil && (node.Kind == ast.KindParenthesizedExpression) {
		node = node.Expression()
	}
	return node
}
