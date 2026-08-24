package config_refined_values

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"regexp"
	"strings"
)

var message = rule.RuleMessage{
	Id:          "config-refined-values",
	Description: "Refine configuration values.",
	Help:        "Use Config.schema or Config.mapOrFail for path, URL, port, and identifier values.",
}

var refinedKey = regexp.MustCompile(`(?i)(path|dir|directory|folder|url|uri|host|hostname|endpoint|base[_-]?url|port|id|uuid|identifier|slug|email)$`)
var refinedCalls = map[string]bool{"schema": true, "mapOrFail": true, "url": true, "port": true, "int": true, "boolean": true}
var Rule = rule.Rule{Name: "config-refined-values", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		name, receiver, ok := callName(node)
		if !ok || name != "string" || receiver == nil || !strings.HasSuffix(nodeText(ctx.SourceFile, receiver), "Config") {
			return
		}
		args := node.AsCallExpression().Arguments.Nodes
		if len(args) == 0 || !ast.IsStringLiteralLike(unwrap(args[0])) {
			return
		}
		key := unwrap(args[0]).Text()
		if key == "" || !refinedKey.MatchString(key) {
			return
		}
		for current := node.Parent; current != nil; current = current.Parent {
			if ast.IsCallExpression(current) {
				if parentName, _, found := callName(current); found && refinedCalls[parentName] {
					return
				}
			}
		}
		ctx.ReportNode(node.AsCallExpression().Expression, message)
	}}
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
