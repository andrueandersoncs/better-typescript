package prefer_composed_callbacks

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

var Rule = rule.Rule{
	Name: "prefer-composed-callbacks",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		return rule.RuleListeners{ast.KindArrowFunction: func(node *ast.Node) {
			arrow := node.AsArrowFunction()
			if node.Parent == nil || !ast.IsCallExpression(node.Parent) || len(arrow.Parameters.Nodes) != 1 || arrow.Body == nil || ast.IsBlock(arrow.Body) {
				return
			}
			parameter := arrow.Parameters.Nodes[0].Name()
			if !ast.IsIdentifier(parameter) {
				return
			}
			symbol := ctx.TypeChecker.GetSymbolAtLocation(parameter)
			if symbol == nil {
				return
			}
			body := unwrap(arrow.Body)
			if isDirectForward(ctx, symbol, body) || !hasParameterBearingCall(ctx, symbol, body) {
				return
			}
			ctx.ReportNode(node, rule.RuleMessage{Id: "prefer-composed-callbacks", Description: "Avoid inline callbacks that compose the callback parameter through calls.", Help: "Use flow or pipe when the parameter moves through a composition. When no combinator expresses the transformation, name the adapter in the nearest scope and pass it by reference."})
		}}
	},
}

func unwrap(node *ast.Node) *ast.Node {
	for node != nil {
		switch node.Kind {
		case ast.KindParenthesizedExpression:
			node = node.AsParenthesizedExpression().Expression
		case ast.KindAsExpression:
			node = node.AsAsExpression().Expression
		case ast.KindSatisfiesExpression:
			node = node.AsSatisfiesExpression().Expression
		case ast.KindNonNullExpression:
			node = node.AsNonNullExpression().Expression
		default:
			return node
		}
	}
	return nil
}
func isDirectForward(ctx rule.RuleContext, symbol *ast.Symbol, body *ast.Node) bool {
	if !ast.IsCallExpression(body) {
		return false
	}
	arguments := body.AsCallExpression().Arguments.Nodes
	if len(arguments) != 1 {
		return false
	}
	argument := unwrap(arguments[0])
	return ast.IsIdentifier(argument) && ctx.TypeChecker.GetSymbolAtLocation(argument) == symbol
}
func referencesSymbol(ctx rule.RuleContext, symbol *ast.Symbol, node *ast.Node) bool {
	if ast.IsIdentifier(node) && ctx.TypeChecker.GetSymbolAtLocation(node) == symbol {
		return true
	}
	found := false
	node.ForEachChild(func(child *ast.Node) bool {
		if referencesSymbol(ctx, symbol, child) {
			found = true
			return true
		}
		return false
	})
	return found
}
func hasParameterBearingCall(ctx rule.RuleContext, symbol *ast.Symbol, node *ast.Node) bool {
	if ast.IsCallExpression(node) {
		for _, argument := range node.AsCallExpression().Arguments.Nodes {
			if referencesSymbol(ctx, symbol, argument) {
				return true
			}
		}
	}
	found := false
	node.ForEachChild(func(child *ast.Node) bool {
		if hasParameterBearingCall(ctx, symbol, child) {
			found = true
			return true
		}
		return false
	})
	return found
}
