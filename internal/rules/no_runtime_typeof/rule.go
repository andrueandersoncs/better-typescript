package no_runtime_typeof

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "no-runtime-typeof",
	Description: "A `typeof` check narrows a representation without establishing its contract.",
	Help:        "Parse input at its I/O boundary, then branch on the domain value.",
}

func equality(kind ast.Kind) bool {
	switch kind {
	case ast.KindEqualsEqualsToken, ast.KindEqualsEqualsEqualsToken, ast.KindExclamationEqualsToken, ast.KindExclamationEqualsEqualsToken:
		return true
	default:
		return false
	}
}

func existenceProbe(node *ast.Node) bool {
	current := node
	for current.Parent != nil && ast.IsParenthesizedExpression(current.Parent) {
		current = current.Parent
	}
	parent := current.Parent
	if parent == nil || !ast.IsBinaryExpression(parent) {
		return false
	}
	binary := parent.AsBinaryExpression()
	if !equality(binary.OperatorToken.Kind) {
		return false
	}
	other := binary.Left
	if ast.SkipParentheses(other) == node {
		other = binary.Right
	} else if ast.SkipParentheses(binary.Right) != node {
		return false
	}
	other = ast.SkipParentheses(other)
	return ast.IsStringLiteralLike(other) && other.Text() == "undefined"
}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindTypeOfExpression: func(node *ast.Node) {
		if !existenceProbe(node) {
			ctx.ReportNode(node, message)
		}
	}}
}

var Rule = rule.Rule{Name: "no-runtime-typeof", Run: run}
