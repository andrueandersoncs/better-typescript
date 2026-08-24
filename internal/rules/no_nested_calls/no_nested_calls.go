package no_nested_calls

import (
	"fmt"
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/checker"
)

const help = "A call whose result feeds another call hides a sequence of steps in one expression that reads inside-out. Declare the inner result as a const (or a yield* step in a gen block) and pass the name, or restructure data-last so the value flows through pipe. Calls that return functions stay inline: currying and pipe stages read left-to-right."

var Rule = rule.Rule{Name: "no-nested-calls", Run: run}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	check := func(node *ast.Node) {
		consumer := consumingCall(node)
		if consumer == nil {
			return
		}
		produced := ctx.TypeChecker.GetTypeAtLocation(node)
		if len(ctx.TypeChecker.GetSignaturesOfType(produced, checker.SignatureKindCall)) > 0 {
			return
		}
		args := callArguments(consumer)
		callee := callExpression(consumer)
		if consumer.Kind == ast.KindCallExpression && callee.Kind == ast.KindIdentifier && callee.Text() == "pipe" && len(args) > 0 && args[0] == node {
			return
		}
		ctx.ReportNode(node, rule.RuleMessage{Id: "no-nested-calls", Description: fmt.Sprintf("Avoid computing %s inline in the arguments of %s.", calleeText(ctx, node), calleeText(ctx, consumer)), Help: help})
	}
	return rule.RuleListeners{ast.KindCallExpression: check, ast.KindNewExpression: check}
}
func consumingCall(node *ast.Node) *ast.Node {
	parent := node.Parent
	if parent == nil {
		return nil
	}
	if parent.Kind == ast.KindCallExpression || parent.Kind == ast.KindNewExpression {
		for _, argument := range callArguments(parent) {
			if argument == node {
				return parent
			}
		}
		return nil
	}
	switch parent.Kind {
	case ast.KindParenthesizedExpression, ast.KindAsExpression, ast.KindSatisfiesExpression, ast.KindNonNullExpression,
		ast.KindObjectLiteralExpression, ast.KindPropertyAssignment, ast.KindShorthandPropertyAssignment, ast.KindSpreadAssignment,
		ast.KindArrayLiteralExpression, ast.KindSpreadElement, ast.KindConditionalExpression, ast.KindBinaryExpression,
		ast.KindPrefixUnaryExpression, ast.KindPostfixUnaryExpression, ast.KindAwaitExpression, ast.KindYieldExpression,
		ast.KindTypeOfExpression, ast.KindVoidExpression, ast.KindPropertyAccessExpression, ast.KindElementAccessExpression,
		ast.KindTemplateSpan, ast.KindTemplateExpression:
		return consumingCall(parent)
	}
	return nil
}
func callArguments(node *ast.Node) []*ast.Node {
	if node.Kind == ast.KindCallExpression {
		if node.AsCallExpression().Arguments != nil {
			return node.AsCallExpression().Arguments.Nodes
		}
	}
	if node.Kind == ast.KindNewExpression {
		if node.AsNewExpression().Arguments != nil {
			return node.AsNewExpression().Arguments.Nodes
		}
	}
	return nil
}
func callExpression(node *ast.Node) *ast.Node {
	if node.Kind == ast.KindNewExpression {
		return node.AsNewExpression().Expression
	}
	return node.AsCallExpression().Expression
}
func calleeText(ctx rule.RuleContext, node *ast.Node) string {
	callee := callExpression(node)
	textRange := utils.TrimNodeTextRange(ctx.SourceFile, callee)
	text := ctx.SourceFile.Text()[textRange.Pos():textRange.End()]
	if node.Kind == ast.KindNewExpression {
		return "new " + text
	}
	return text
}
