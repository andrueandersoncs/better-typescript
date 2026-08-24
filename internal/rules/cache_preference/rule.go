package cache_preference

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
	"regexp"
	"strings"
)

var message = rule.RuleMessage{
	Id:          "cache-preference",
	Description: "Prefer Effect Cache when its lifecycle semantics fit.",
	Help:        "Use Cache.make or Cache.makeWith instead of a hand-rolled cache.",
}

var ttlName = regexp.MustCompile(`(?i)^(expires?(At)?|expiry|ttl|deadline|validUntil|staleAt)$`)
var Rule = rule.Rule{Name: "cache-preference", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{
		ast.KindNewExpression: func(node *ast.Node) {
			expression := unwrap(node.AsNewExpression().Expression)
			if expression == nil || !ast.IsIdentifier(expression) || expression.Text() != "Map" {
				return
			}
			binding := bindingName(ctx, node)
			if binding != "" && strings.Contains(strings.ToLower(binding), "cache") {
				ctx.ReportNode(expression, message)
			}
		},
		ast.KindCallExpression: func(node *ast.Node) {
			name, _, ok := callName(node)
			if !ok || name != "set" {
				return
			}
			args := node.AsCallExpression().Arguments.Nodes
			if len(args) < 2 || !objectHasTTL(args[1]) || fileUsesEffectCache(ctx) {
				return
			}
			ctx.ReportNode(node.AsCallExpression().Expression, message)
		},
	}
}}

func bindingName(ctx rule.RuleContext, node *ast.Node) string {
	parent := node.Parent
	if parent == nil {
		return ""
	}
	if ast.IsVariableDeclaration(parent) || ast.IsPropertyAssignment(parent) {
		name, ok := ast.TryGetTextOfPropertyName(parent.Name())
		if ok {
			return name
		}
		return ""
	}
	if ast.IsBinaryExpression(parent) && parent.AsBinaryExpression().Right == node {
		return nodeText(ctx.SourceFile, parent.AsBinaryExpression().Left)
	}
	return ""
}
func objectHasTTL(node *ast.Node) bool {
	node = unwrap(node)
	if !ast.IsObjectLiteralExpression(node) {
		return false
	}
	for _, prop := range node.AsObjectLiteralExpression().Properties.Nodes {
		if !ast.IsPropertyAssignment(prop) && !ast.IsShorthandPropertyAssignment(prop) {
			continue
		}
		name, ok := ast.TryGetTextOfPropertyName(prop.Name())
		if ok && ttlName.MatchString(name) {
			return true
		}
	}
	return false
}
func fileUsesEffectCache(ctx rule.RuleContext) bool {
	return walk(ctx.SourceFile.AsNode(), func(node *ast.Node) bool {
		if !ast.IsCallExpression(node) {
			return false
		}
		name, receiver, ok := callName(node)
		return ok && (name == "make" || name == "makeWith") && receiver != nil && strings.HasSuffix(nodeText(ctx.SourceFile, receiver), "Cache")
	})
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
