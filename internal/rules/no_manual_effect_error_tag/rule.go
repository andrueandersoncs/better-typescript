package no_manual_effect_error_tag

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var tagMessage = rule.RuleMessage{
	Id:          "no-manual-effect-error-tag",
	Description: "Use Effect.catchTag or Effect.catchTags.",
	Help:        "Do not manually discriminate a tagged error in a broad Effect catch handler.",
}
var reasonMessage = rule.RuleMessage{
	Id:          "no-manual-effect-error-tag",
	Description: "Use Effect.catchReason or Effect.catchReasons.",
	Help:        "Do not manually discriminate a tagged `reason` in a broad Effect catch handler.",
}

func member(node *ast.Node) (*ast.Node, string) {
	node = ast.SkipParentheses(node)
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
	_, name := member(node)
	return name == "_tag"
}

func reasonTag(node *ast.Node) bool {
	receiver, name := member(node)
	if name != "_tag" {
		return false
	}
	_, receiverName := member(receiver)
	return receiverName == "reason"
}

func equality(kind ast.Kind) bool {
	switch kind {
	case ast.KindEqualsEqualsToken, ast.KindEqualsEqualsEqualsToken, ast.KindExclamationEqualsToken, ast.KindExclamationEqualsEqualsToken:
		return true
	default:
		return false
	}
}

func comparedTag(node *ast.Node) *ast.Node {
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

func broadCatch(node *ast.Node) bool {
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

func insideHandler(node *ast.Node) bool {
	for current := node.Parent; current != nil && !ast.IsSourceFile(current); current = current.Parent {
		if current.Kind != ast.KindArrowFunction && current.Kind != ast.KindFunctionExpression {
			if ast.IsFunctionLike(current) {
				return false
			}
			continue
		}
		parent := current.Parent
		if !broadCatch(parent) {
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

func report(ctx rule.RuleContext, node, tag *ast.Node) {
	message := tagMessage
	if reasonTag(tag) {
		message = reasonMessage
	}
	ctx.ReportNode(node, message)
}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{
		ast.KindBinaryExpression: func(node *ast.Node) {
			if tag := comparedTag(node); tag != nil && insideHandler(node) {
				report(ctx, node, tag)
			}
		},
		ast.KindSwitchStatement: func(node *ast.Node) {
			tag := node.AsSwitchStatement().Expression
			if tagMember(tag) && insideHandler(node) {
				report(ctx, node, tag)
			}
		},
	}
}

var Rule = rule.Rule{Name: "no-manual-effect-error-tag", Run: run}
