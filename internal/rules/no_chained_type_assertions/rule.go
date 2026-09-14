package no_chained_type_assertions

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "no-chained-type-assertions",
	Description: "This assertion chain discards type evidence.",
	Help:        "Keep the original precise type, or parse untrusted input at its boundary before narrowing it.",
}

func assertion(node *ast.Node) bool {
	return node != nil && (node.Kind == ast.KindAsExpression || node.Kind == ast.KindTypeAssertionExpression)
}

func unwrapParentheses(node *ast.Node) *ast.Node {
	for node != nil && ast.IsParenthesizedExpression(node) {
		node = node.AsParenthesizedExpression().Expression
	}
	return node
}

func constAssertion(node *ast.Node) bool {
	typeNode := node.Type()
	return typeNode != nil && ast.IsTypeReferenceNode(typeNode) && ast.IsIdentifier(typeNode.AsTypeReferenceNode().TypeName) && typeNode.AsTypeReferenceNode().TypeName.Text() == "const"
}

func outermostAssertion(node *ast.Node) bool {
	current := node
	parent := node.Parent
	for parent != nil && ast.IsParenthesizedExpression(parent) && parent.AsParenthesizedExpression().Expression == current {
		current = parent
		parent = parent.Parent
	}
	return !assertion(parent) || parent.Expression() != current
}

func forbiddenChain(node *ast.Node) bool {
	count := 0
	nonConst := false
	current := node
	for assertion(current) {
		count++
		nonConst = nonConst || !constAssertion(current)
		current = unwrapParentheses(current.Expression())
	}
	return count > 1 && nonConst
}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	check := func(node *ast.Node) {
		if outermostAssertion(node) && forbiddenChain(node) {
			ctx.ReportNode(node, message)
		}
	}
	return rule.RuleListeners{
		ast.KindAsExpression:            check,
		ast.KindTypeAssertionExpression: check,
	}
}

var Rule = rule.Rule{Name: "no-chained-type-assertions", Run: run}
