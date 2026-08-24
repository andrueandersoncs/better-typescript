package typed_boundary_error

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
	"path"
	"regexp"
	"strings"
)

var message = rule.RuleMessage{Id: "typedBoundaryError", Description: "Map boundary failures to typed domain errors.", Help: "Translate infrastructure failures at the adapter seam into an operation-labelled domain error."}

func constructionName(node *ast.Node) string {
	var callee *ast.Node
	if ast.IsNewExpression(node) {
		callee = node.AsNewExpression().Expression
	} else if ast.IsCallExpression(node) {
		callee = node.AsCallExpression().Expression
	} else {
		return ""
	}
	callee = skipTransparent(callee)
	if callee == nil {
		return ""
	}
	if callee.Kind == ast.KindIdentifier {
		return callee.Text()
	}
	if ast.IsPropertyAccessExpression(callee) && callee.Name() != nil {
		return callee.Name().Text()
	}
	return ""
}

var TypedBoundaryErrorRule = rule.Rule{Name: "typed-boundary-error", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	imports := collectAPIImports(ctx.SourceFile.Text())
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		call := node.AsCallExpression()
		if !isAPICall(imports, call, "Effect", "catchAll", "catchAllDefect", "catchCause", "catchAllCause") {
			return
		}
		if call.Arguments == nil || len(call.Arguments.Nodes) == 0 {
			return
		}
		handler := call.Arguments.Nodes[0]
		if len(call.Arguments.Nodes) > 1 {
			handler = call.Arguments.Nodes[1]
		}
		raw := false
		walk(handler, func(current *ast.Node) bool {
			if current.Kind == ast.KindThrowStatement {
				raw = true
				return false
			}
			name := constructionName(current)
			if ast.IsNewExpression(current) && name == "Error" {
				raw = true
			}
			return false
		})
		if raw {
			ctx.ReportNode(call.Expression, message)
		}
	}}
}}

type apiImports struct {
	namespaces map[string]string
	members    map[string][2]string
}

func collectAPIImports(text string) apiImports {
	result := apiImports{namespaces: map[string]string{}, members: map[string][2]string{}}
	re := regexp.MustCompile(`(?ms)^\s*import\s+(\{[^}]*\}|\*\s+as\s+[A-Za-z_$][\w$]*)\s+from\s+["']([^"']+)["']`)
	for _, match := range re.FindAllStringSubmatch(text, -1) {
		clause, module := strings.TrimSpace(match[1]), match[2]
		family := ""
		if strings.HasPrefix(module, "effect/") {
			family = path.Base(module)
		}
		if strings.HasPrefix(clause, "* as ") && family != "" {
			result.namespaces[strings.TrimSpace(strings.TrimPrefix(clause, "* as "))] = family
			continue
		}
		start, end := strings.Index(clause, "{"), strings.LastIndex(clause, "}")
		if start < 0 || end <= start {
			continue
		}
		for _, item := range strings.Split(clause[start+1:end], ",") {
			parts := strings.Fields(strings.TrimSpace(item))
			if len(parts) == 0 || parts[0] == "type" {
				continue
			}
			imported, local := parts[0], parts[0]
			if len(parts) >= 3 && parts[1] == "as" {
				local = parts[2]
			}
			if module == "effect" {
				result.namespaces[local] = imported
			} else if family != "" {
				result.members[local] = [2]string{family, imported}
			}
		}
	}
	return result
}

func skipTransparent(node *ast.Node) *ast.Node {
	for node != nil {
		switch node.Kind {
		case ast.KindParenthesizedExpression, ast.KindAsExpression, ast.KindTypeAssertionExpression,
			ast.KindNonNullExpression, ast.KindSatisfiesExpression:
			node = node.Expression()
		default:
			return node
		}
	}
	return nil
}

func isAPICall(imports apiImports, call *ast.CallExpression, family string, names ...string) bool {
	callee := skipTransparent(call.Expression)
	if callee == nil {
		return false
	}
	contains := func(name string) bool {
		for _, candidate := range names {
			if candidate == name {
				return true
			}
		}
		return false
	}
	if ast.IsPropertyAccessExpression(callee) {
		access := callee.AsPropertyAccessExpression()
		name := access.Name()
		receiver := skipTransparent(access.Expression)
		return name != nil && receiver != nil && receiver.Kind == ast.KindIdentifier &&
			imports.namespaces[receiver.Text()] == family && contains(name.Text())
	}
	if callee.Kind == ast.KindIdentifier {
		member, ok := imports.members[callee.Text()]
		return ok && member[0] == family && contains(member[1])
	}
	return false
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

var Rule = TypedBoundaryErrorRule
