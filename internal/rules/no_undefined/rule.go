package no_undefined

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

const help = "Use Effect's Option module to model optional values, and convert nullable boundaries with Option.fromNullishOr (incoming) and Option.getOrUndefined (outgoing). When a third-party signature forces undefined on a callback, keep the callback inline or annotate it with the library's own callback type so the undefined stays in the library's declaration, not yours."

var Rule = rule.Rule{
	Name: "no-undefined",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		listeners := rule.RuleListeners{}
		listeners[ast.KindParameter] = func(node *ast.Node) {
			parameter := node.AsParameterDeclaration()
			if parameter.QuestionToken != nil || containsUndefined(parameter.Type) {
				report(ctx, node, "Avoid function parameters that accept undefined.")
			}
		}
		for _, kind := range []ast.Kind{ast.KindFunctionDeclaration, ast.KindFunctionExpression, ast.KindArrowFunction, ast.KindMethodDeclaration, ast.KindMethodSignature, ast.KindCallSignature, ast.KindFunctionType, ast.KindGetAccessor} {
			listeners[kind] = func(node *ast.Node) {
				if containsUndefined(node.Type()) {
					report(ctx, node, "Avoid function return types that include undefined.")
				}
			}
		}
		listeners[ast.KindReturnStatement] = func(node *ast.Node) {
			expression := node.AsReturnStatement().Expression
			if isUndefinedExpression(expression) {
				report(ctx, node, "Avoid returning undefined from functions.")
			}
		}
		listeners[ast.KindArrowFunction] = combine(listeners[ast.KindArrowFunction], func(node *ast.Node) {
			body := node.AsArrowFunction().Body
			if body != nil && !ast.IsBlock(body) && isUndefinedExpression(body) {
				report(ctx, node, "Avoid returning undefined from functions.")
			}
		})
		listeners[ast.KindPropertySignature] = func(node *ast.Node) {
			property := node.AsPropertySignatureDeclaration()
			if node.QuestionToken() != nil || containsUndefined(property.Type) {
				report(ctx, node, "Avoid optional or undefined properties in type declarations.")
			}
		}
		listeners[ast.KindMappedType] = func(node *ast.Node) {
			mapped := node.AsMappedTypeNode()
			optional := mapped.QuestionToken != nil && mapped.QuestionToken.Kind != ast.KindMinusToken
			if optional || containsUndefined(mapped.Type) {
				report(ctx, node, "Avoid optional or undefined properties in type declarations.")
			}
		}
		listeners[ast.KindBinaryExpression] = func(node *ast.Node) {
			expression := node.AsBinaryExpression()
			switch expression.OperatorToken.Kind {
			case ast.KindEqualsEqualsToken, ast.KindEqualsEqualsEqualsToken, ast.KindExclamationEqualsToken, ast.KindExclamationEqualsEqualsToken:
				if isUndefinedExpression(expression.Left) || isUndefinedExpression(expression.Right) {
					report(ctx, node, "Avoid comparing values against undefined.")
				}
			}
		}
		return listeners
	},
}

func combine(first, second func(*ast.Node)) func(*ast.Node) {
	return func(node *ast.Node) { first(node); second(node) }
}
func report(ctx rule.RuleContext, node *ast.Node, description string) {
	ctx.ReportNode(node, rule.RuleMessage{Id: "no-undefined", Description: description, Help: help})
}
func containsUndefined(node *ast.Node) bool {
	if node == nil {
		return false
	}
	if node.Kind == ast.KindUndefinedKeyword {
		return true
	}
	found := false
	node.ForEachChild(func(child *ast.Node) bool {
		if containsUndefined(child) {
			found = true
			return true
		}
		return false
	})
	return found
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
func isUndefinedExpression(node *ast.Node) bool {
	node = unwrap(node)
	return node != nil && ast.IsIdentifier(node) && node.Text() == "undefined"
}
