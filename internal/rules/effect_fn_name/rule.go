package effect_fn_name

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"regexp"
	"strings"
)

var message = rule.RuleMessage{
	Id:          "effect-fn-name",
	Description: "Use a non-empty domain-qualified Effect.fn name.",
	Help:        "Use a stable name such as UserRepo.get for tracing and spans.",
}

var qualified = regexp.MustCompile(`^[^.\s]+\.[^.\s]+`)
var Rule = rule.Rule{Name: "effect-fn-name", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		call := node.AsCallExpression()
		callee := unwrap(call.Expression)
		if ast.IsCallExpression(callee) && isEffectFn(ctx, callee) {
			inner := callee.AsCallExpression()
			target := inner.Expression
			name := ""
			if len(inner.Arguments.Nodes) > 0 && ast.IsStringLiteralLike(unwrap(inner.Arguments.Nodes[0])) {
				target = unwrap(inner.Arguments.Nodes[0])
				name = target.Text()
			}
			if !qualified.MatchString(name) {
				ctx.ReportNode(target, message)
			}
			return
		}
		if !isEffectFn(ctx, node) || len(call.Arguments.Nodes) == 0 {
			return
		}
		first := unwrap(call.Arguments.Nodes[0])
		if ast.IsArrowFunction(first) || ast.IsFunctionExpression(first) || ast.IsObjectLiteralExpression(first) {
			ctx.ReportNode(call.Expression, message)
		}
	}}
}}

func isEffectFn(ctx rule.RuleContext, node *ast.Node) bool {
	name, receiver, ok := callName(node)
	return ok && name == "fn" && receiver != nil && strings.HasSuffix(nodeText(ctx.SourceFile, receiver), "Effect")
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
