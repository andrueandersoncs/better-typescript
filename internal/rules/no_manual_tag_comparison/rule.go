package no_manual_tag_comparison

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var comparisonMessage = rule.RuleMessage{
	Id:          "no-manual-tag-comparison",
	Description: "Use Match.tag or Match.tags for tagged-value branching.",
	Help:        "Use Predicate.isTagged for a simple reusable predicate.",
}
var switchMessage = rule.RuleMessage{
	Id:          "no-manual-tag-comparison",
	Description: "Do not switch on `_tag`.",
	Help:        "Use Match.value(value).pipe(Match.tag, Match.tags, or Match.tagsExhaustive), or use the tagged enum `$match` helper.",
}

func memberName(node *ast.Node) (*ast.Node, string) {
	if ast.IsPropertyAccessExpression(node) {
		access := node.AsPropertyAccessExpression()
		return access.Expression, access.Name().Text()
	}
	if ast.IsElementAccessExpression(node) {
		access := node.AsElementAccessExpression()
		if ast.IsStringLiteralLike(access.ArgumentExpression) {
			return access.Expression, access.ArgumentExpression.Text()
		}
	}
	return nil, ""
}

func tagMember(node *ast.Node) bool {
	_, name := memberName(ast.SkipParentheses(node))
	return name == "_tag"
}

func equality(kind ast.Kind) bool {
	switch kind {
	case ast.KindEqualsEqualsToken, ast.KindEqualsEqualsEqualsToken, ast.KindExclamationEqualsToken, ast.KindExclamationEqualsEqualsToken:
		return true
	default:
		return false
	}
}

func tagComparison(node *ast.Node) *ast.Node {
	if !ast.IsBinaryExpression(node) || !equality(node.AsBinaryExpression().OperatorToken.Kind) {
		return nil
	}
	binary := node.AsBinaryExpression()
	if tagMember(binary.Left) && ast.IsStringLiteralLike(binary.Right) {
		return binary.Left
	}
	if tagMember(binary.Right) && ast.IsStringLiteralLike(binary.Left) {
		return binary.Right
	}
	return nil
}

func broadCatchCall(node *ast.Node) bool {
	if node == nil || !ast.IsCallExpression(node) || !ast.IsPropertyAccessExpression(node.AsCallExpression().Expression) {
		return false
	}
	access := node.AsCallExpression().Expression.AsPropertyAccessExpression()
	if !ast.IsIdentifier(access.Expression) || access.Expression.Text() != "Effect" {
		return false
	}
	switch access.Name().Text() {
	case "catch", "catchAll", "catchIf":
		return true
	default:
		return false
	}
}

func insideBroadHandler(node *ast.Node) bool {
	for current := node.Parent; current != nil && !ast.IsSourceFile(current); current = current.Parent {
		if current.Kind != ast.KindArrowFunction && current.Kind != ast.KindFunctionExpression {
			if ast.IsFunctionLike(current) {
				return false
			}
			continue
		}
		parent := current.Parent
		if !broadCatchCall(parent) {
			return false
		}
		for _, argument := range parent.AsCallExpression().Arguments.Nodes {
			if argument == current {
				return true
			}
		}
		return false
	}
	return false
}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{
		ast.KindBinaryExpression: func(node *ast.Node) {
			if tagComparison(node) != nil && !insideBroadHandler(node) {
				ctx.ReportNode(node, comparisonMessage)
			}
		},
		ast.KindSwitchStatement: func(node *ast.Node) {
			if tagMember(node.AsSwitchStatement().Expression) && !insideBroadHandler(node) {
				ctx.ReportNode(node, switchMessage)
			}
		},
	}
}

var Rule = rule.Rule{Name: "no-manual-tag-comparison", Run: run}
