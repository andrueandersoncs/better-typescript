package http_status_decode_order

import (
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "http-status-decode-order",
	Description: "Classify HTTP status before decoding a successful response body.",
	Help:        "Apply filterStatusOk or an equivalent response classifier first.",
}

var bodyNames = map[string]bool{"json": true, "text": true, "arrayBuffer": true, "blob": true, "formData": true, "bytes": true}
var statusNames = map[string]bool{"status": true, "ok": true, "statusText": true}
var classifyNames = map[string]bool{"filterStatusOk": true, "filterStatus": true, "matchStatus": true}
var decodeCallNames = map[string]bool{"decodeUnknown": true, "decodeUnknownEffect": true, "decode": true, "decodeEffect": true, "schemaBodyJson": true, "schemaJson": true, "schemaNoBody": true}
var Rule = rule.Rule{Name: "http-status-decode-order", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		name, _, ok := callName(node)
		if !ok || (!bodyNames[name] && !decodeCallNames[name]) {
			return
		}
		fn := enclosingFunction(node)
		if fn == nil || (decodeCallNames[name] && !functionLooksHTTP(fn)) {
			return
		}
		sawStatus, reached := false, false
		walk(fn, func(current *ast.Node) bool {
			if current == node {
				reached = true
				return true
			}
			if classifiesStatus(current) {
				sawStatus = true
			}
			return false
		})
		if reached && !sawStatus {
			ctx.ReportNode(node, message)
		}
	}}
}}

func classifiesStatus(node *ast.Node) bool {
	if ast.IsPropertyAccessExpression(node) {
		return statusNames[node.Name().Text()]
	}
	if ast.IsCallExpression(node) {
		name, _, ok := callName(node)
		return ok && classifyNames[name]
	}
	return false
}
func functionLooksHTTP(fn *ast.Node) bool {
	return walk(fn, func(node *ast.Node) bool {
		if !ast.IsCallExpression(node) {
			return false
		}
		name, _, ok := callName(node)
		return ok && (bodyNames[name] || classifyNames[name] || name == "execute" || name == "get" || name == "post" || name == "put" || name == "patch" || name == "del")
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
