package cache_per_request

import (
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

var message = rule.RuleMessage{
	Id:          "cache-per-request",
	Description: "Construct Cache once in its owning layer or scope, not per request.",
	Help:        "Create the cache during layer acquisition and close over the shared handle.",
}

var Rule = rule.Rule{Name: "cache-per-request", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		name, receiver, ok := callName(node)
		if !ok || (name != "make" && name != "makeWith") || receiver == nil || !strings.HasSuffix(nodeText(ctx.SourceFile, receiver), "Cache") {
			return
		}
		fn := enclosingFunction(node)
		if fn == nil || nestedInCacheLookup(ctx, node) {
			return
		}
		if len(fn.Parameters()) > 0 || !isModuleScopeFunction(fn) {
			ctx.ReportNode(node, message)
		}
	}}
}}

func isModuleScopeFunction(fn *ast.Node) bool {
	if fn.Parent == nil {
		return false
	}
	if ast.IsSourceFile(fn.Parent) || ast.IsModuleBlock(fn.Parent) {
		return true
	}
	if ast.IsVariableDeclaration(fn.Parent) {
		current := fn.Parent
		for current != nil && !ast.IsVariableStatement(current) {
			current = current.Parent
		}
		return current != nil && current.Parent != nil && ast.IsSourceFile(current.Parent)
	}
	return false
}

func nestedInCacheLookup(ctx rule.RuleContext, node *ast.Node) bool {
	for current := node.Parent; current != nil; current = current.Parent {
		if ast.IsCallExpression(current) {
			name, receiver, ok := callName(current)
			if ok && (name == "make" || name == "makeWith") && receiver != nil && strings.HasSuffix(nodeText(ctx.SourceFile, receiver), "Cache") {
				return true
			}
		}
	}
	return false
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
