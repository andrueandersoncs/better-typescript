package boundary_schema_decode

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"regexp"
	"strings"
)

var message = rule.RuleMessage{
	Id:          "boundary-schema-decode",
	Description: "Decode unknown boundary data.",
	Help:        "Use Schema.decodeUnknownEffect or a boundary-specific decoder before consuming the value.",
}

var decodeNames = map[string]bool{
	"decodeUnknown": true, "decodeUnknownEffect": true, "decodeUnknownSync": true,
	"decodeUnknownOption": true, "decodeUnknownEither": true, "decodeUnknownResult": true,
	"decodeUnknownExit": true, "decodeUnknownPromise": true, "decode": true,
	"decodeEffect": true, "decodeSync": true, "decodeOption": true, "decodeEither": true,
	"decodeResult": true, "decodeExit": true, "decodePromise": true,
}

var Rule = rule.Rule{Name: "boundary-schema-decode", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		call := node.AsCallExpression()
		name, receiver, ok := callName(node)
		if !ok {
			return
		}
		subject := ""
		target := call.Expression
		if name == "parse" && receiver != nil && ast.IsIdentifier(unwrap(receiver)) && unwrap(receiver).Text() == "JSON" {
			subject = "JSON.parse"
		} else if name == "json" && receiver != nil {
			receiverText := nodeText(ctx.SourceFile, receiver)
			if !regexp.MustCompile(`(?i)(request|req|body|payload|event)`).MatchString(receiverText) {
				return
			}
			subject = nodeText(ctx.SourceFile, call.Expression)
		} else {
			return
		}
		if decodedAround(ctx, node) {
			return
		}
		_ = subject
		ctx.ReportNode(target, message)
	}}
}}

func decodedAround(ctx rule.RuleContext, node *ast.Node) bool {
	for current := node.Parent; current != nil && !ast.IsFunctionLike(current); current = current.Parent {
		if ast.IsCallExpression(current) {
			if name, _, ok := callName(current); ok && decodeNames[name] {
				return true
			}
		}
	}
	fn := enclosingFunction(node)
	return fn != nil && walk(fn, func(current *ast.Node) bool {
		if !ast.IsCallExpression(current) {
			return false
		}
		name, _, ok := callName(current)
		return ok && decodeNames[name]
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
