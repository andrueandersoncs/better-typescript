package http_response_validation

import (
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

var message = rule.RuleMessage{
	Id:          "http-response-validation",
	Description: "Decode unknown HTTP response data with Schema at the adapter boundary.",
	Help:        "Apply Schema.decodeUnknownEffect or an HttpClient response schema decoder.",
}

var validationNames = map[string]bool{
	"decodeUnknown": true, "decodeUnknownEffect": true, "decodeUnknownSync": true, "decodeUnknownOption": true, "decodeUnknownEither": true, "decodeUnknownResult": true, "decodeUnknownExit": true, "decodeUnknownPromise": true,
	"decode": true, "decodeEffect": true, "decodeSync": true, "decodeOption": true, "decodeEither": true, "decodeResult": true, "decodeExit": true, "decodePromise": true,
	"schemaBodyJson": true, "schemaJson": true, "schemaNoBody": true,
}
var Rule = rule.Rule{Name: "http-response-validation", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		name, _, ok := callName(node)
		if !ok || name != "json" || nearbyValidation(node) {
			return
		}
		ctx.ReportNode(node, message)
	}}
}}

func nearbyValidation(node *ast.Node) bool {
	for current := node.Parent; current != nil && !ast.IsFunctionLike(current); current = current.Parent {
		if isValidationCall(current) {
			return true
		}
	}
	fn := enclosingFunction(node)
	return fn != nil && walk(fn, isValidationCall)
}
func isValidationCall(node *ast.Node) bool {
	if !ast.IsCallExpression(node) {
		return false
	}
	name, _, ok := callName(node)
	return ok && validationNames[name]
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
