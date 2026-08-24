package no_value_aliases

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

var Rule = rule.Rule{
	Name: "no-value-aliases",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		return rule.RuleListeners{ast.KindVariableDeclaration: func(node *ast.Node) {
			declaration := node.AsVariableDeclaration()
			if node.Parent == nil || !ast.IsVariableDeclarationList(node.Parent) || node.Parent.Flags&ast.NodeFlagsConst == 0 || !ast.IsIdentifier(declaration.Name()) || declaration.Initializer == nil {
				return
			}
			if isDottedValueReference(unwrapAliasExpression(declaration.Initializer)) {
				ctx.ReportNode(node, rule.RuleMessage{Id: "no-value-aliases", Description: "Do not declare aliases for existing values.", Help: "Use the referenced value directly. If it needs distinct semantics or one-time evaluation, introduce behavior or constructed data instead of another name for the same value."})
			}
		}}
	},
}

func unwrapAliasExpression(node *ast.Node) *ast.Node {
	for node != nil {
		switch node.Kind {
		case ast.KindParenthesizedExpression:
			node = node.AsParenthesizedExpression().Expression
		case ast.KindAsExpression:
			node = node.AsAsExpression().Expression
		case ast.KindSatisfiesExpression:
			node = node.AsSatisfiesExpression().Expression
		case ast.KindTypeAssertionExpression:
			node = node.AsTypeAssertion().Expression
		case ast.KindNonNullExpression:
			node = node.AsNonNullExpression().Expression
		default:
			return node
		}
	}
	return nil
}

func isDottedValueReference(node *ast.Node) bool {
	if ast.IsIdentifier(node) {
		return true
	}
	if !ast.IsPropertyAccessExpression(node) {
		return false
	}
	access := node.AsPropertyAccessExpression()
	return access.QuestionDotToken == nil && isDottedValueReference(access.Expression)
}
