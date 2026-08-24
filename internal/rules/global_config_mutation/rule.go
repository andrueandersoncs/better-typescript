package global_config_mutation

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"regexp"
	"strings"
)

var message = rule.RuleMessage{
	Id:          "global-config-mutation",
	Description: "Avoid mutating process.env in tests; provide deterministic Config instead.",
	Help:        "Use ConfigProvider.fromUnknown or a test configuration service.",
}

var processEnv = regexp.MustCompile(`^(?:globalThis\.)?process(?:\.env|\[['\"]env['\"]\])`)
var Rule = rule.Rule{Name: "global-config-mutation", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	binary := func(node *ast.Node) {
		if !ast.IsAssignmentExpression(node, false) {
			return
		}
		target := unwrap(node.AsBinaryExpression().Left)
		if processEnv.MatchString(strings.ReplaceAll(nodeText(ctx.SourceFile, target), " ", "")) {
			ctx.ReportNode(node, message)
		}
	}
	deletion := func(node *ast.Node) {
		target := unwrap(node.AsDeleteExpression().Expression)
		if processEnv.MatchString(strings.ReplaceAll(nodeText(ctx.SourceFile, target), " ", "")) {
			ctx.ReportNode(node, message)
		}
	}
	return rule.RuleListeners{ast.KindBinaryExpression: binary, ast.KindDeleteExpression: deletion}
}}

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
