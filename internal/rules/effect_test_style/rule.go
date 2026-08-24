package effect_test_style

import (
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

var message = rule.RuleMessage{
	Id:          "effect-test-style",
	Description: "Use it.effect for Effect tests.",
	Help:        "Effect-aware tests provide the correct runtime and deterministic services.",
}

var plainMethods = map[string]bool{"only": true, "skip": true, "todo": true, "concurrent": true, "sequential": true}
var Rule = rule.Rule{Name: "effect-test-style", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		if !strings.Contains(ctx.SourceFile.Text(), "@effect/vitest") || !plainItCall(node) {
			return
		}
		args := node.AsCallExpression().Arguments.Nodes
		for i := len(args) - 1; i >= 0; i-- {
			callback := unwrap(args[i])
			if !(ast.IsArrowFunction(callback) || ast.IsFunctionExpression(callback)) {
				continue
			}
			if callbackReturnsEffect(ctx, callback) {
				ctx.ReportNode(node, message)
			}
			return
		}
	}}
}}

func plainItCall(node *ast.Node) bool {
	callee := unwrap(node.AsCallExpression().Expression)
	if ast.IsIdentifier(callee) {
		return callee.Text() == "it"
	}
	if ast.IsPropertyAccessExpression(callee) {
		name, receiver, _ := propertyName(callee)
		return receiver != nil && ast.IsIdentifier(unwrap(receiver)) && unwrap(receiver).Text() == "it" && plainMethods[name]
	}
	if ast.IsCallExpression(callee) {
		name, receiver, ok := callName(callee)
		return ok && name == "each" && receiver != nil && ast.IsIdentifier(unwrap(receiver)) && unwrap(receiver).Text() == "it"
	}
	return false
}
func callbackReturnsEffect(ctx rule.RuleContext, callback *ast.Node) bool {
	signature := ctx.TypeChecker.GetSignatureFromDeclaration(callback)
	if signature != nil {
		result := ctx.TypeChecker.GetReturnTypeOfSignature(signature)
		if result != nil && strings.Contains(ctx.TypeChecker.TypeToString(result), "Effect") {
			return true
		}
	}
	return strings.Contains(nodeText(ctx.SourceFile, callback), "Effect.")
}

func unwrap(node *ast.Node) *ast.Node {
	for node != nil {
		switch node.Kind {
		case ast.KindParenthesizedExpression:
			node = node.AsParenthesizedExpression().Expression
		case ast.KindAsExpression, ast.KindSatisfiesExpression, ast.KindTypeAssertionExpression:
			node = node.Expression()
		case ast.KindNonNullExpression:
			node = node.Expression()
		default:
			return node
		}
	}
	return nil
}

func propertyName(node *ast.Node) (string, *ast.Node, bool) {
	node = unwrap(node)
	if node == nil || !ast.IsPropertyAccessExpression(node) {
		return "", nil, false
	}
	return node.Name().Text(), node.AsPropertyAccessExpression().Expression, true
}

func callName(node *ast.Node) (string, *ast.Node, bool) {
	if node == nil || !ast.IsCallExpression(node) {
		return "", nil, false
	}
	call := node.AsCallExpression()
	name, receiver, ok := propertyName(call.Expression)
	if ok {
		return name, receiver, true
	}
	callee := unwrap(call.Expression)
	if callee != nil && ast.IsIdentifier(callee) {
		return callee.Text(), nil, true
	}
	return "", nil, false
}

func nodeText(file *ast.SourceFile, node *ast.Node) string {
	if node == nil {
		return ""
	}
	start, end := node.Pos(), node.End()
	text := file.Text()
	if start < 0 {
		start = 0
	}
	if end > len(text) {
		end = len(text)
	}
	if end < start {
		return ""
	}
	return strings.TrimSpace(text[start:end])
}

func walk(node *ast.Node, visit func(*ast.Node) bool) bool {
	if node == nil {
		return false
	}
	if visit(node) {
		return true
	}
	found := false
	node.ForEachChild(func(child *ast.Node) bool {
		if walk(child, visit) {
			found = true
			return true
		}
		return false
	})
	return found
}

func enclosingFunction(node *ast.Node) *ast.Node {
	for current := node.Parent; current != nil; current = current.Parent {
		if ast.IsFunctionLike(current) {
			return current
		}
	}
	return nil
}
