package require_callable_role_name_consistency

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/scanner"
)

var roles = map[string]bool{"accessor": true, "callback": true, "comparator": true, "factory": true, "function": true, "handler": true, "mapper": true, "predicate": true, "reducer": true}
var Rule = rule.Rule{Name: "require-callable-role-name-consistency", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return listeners(func(node *ast.Node) {
		c, ok := callableAt(ctx, node)
		if !ok || len(c.words) < 2 {
			return
		}
		role := last(c.words)
		if !roles[role] {
			return
		}
		s := shape(c.returnType)
		construction := c.construction
		projection := regexp.MustCompile(`^(?:return\s+)?\w+\.\w+\s*;?\s*}?$`).MatchString(strings.TrimSpace(strings.TrimPrefix(c.body, "{")))
		expected := ""
		switch role {
		case "predicate":
			if s != "boolean" {
				expected = "a boolean or type-predicate result"
			}
		case "mapper":
			if len(c.params) < 1 || s == "void" {
				expected = "at least one input and a non-void mapped result"
			}
		case "reducer":
			if len(c.params) < 2 {
				expected = "at least two inputs and a result compatible with its accumulator"
			}
		case "comparator":
			if s != "number" {
				expected = "a numeric comparison result"
			}
		case "factory":
			if !construction {
				expected = "construction of a new value"
			}
		case "handler":
			if s != "void" && !strings.Contains(strings.ToLower(c.returnType), "effect") {
				expected = "a void or Effectful side-effect result"
			}
		case "accessor":
			if !projection {
				expected = "a projected property path from its input"
			}
		case "callback", "function":
			if s != "callable" {
				expected = "a callable result"
			}
		}
		if expected != "" {
			ctx.ReportNode(c.nameNode, rule.RuleMessage{Id: "require-callable-role-name-consistency", Description: fmt.Sprintf("%s claims the %s role, but does not provide %s.", c.name, role, expected), Help: fmt.Sprintf("Rename away from the %s role noun, or change the signature and body so the %s contract holds.", role, role)})
		}
	})
}}

type callable struct {
	nameNode     *ast.Node
	name         string
	words        []string
	returnType   string
	params       []string
	body         string
	construction bool
}

var boundary = regexp.MustCompile(`([a-z0-9])([A-Z])`)

func words(name string) []string {
	snake := boundary.ReplaceAllString(name, "$1 $2")
	return strings.Fields(strings.ToLower(strings.NewReplacer("_", " ", "-", " ").Replace(snake)))
}
func sourceText(ctx rule.RuleContext, n *ast.Node) string {
	if n == nil {
		return ""
	}
	return strings.TrimSpace(scanner.GetTextOfNodeFromSourceText(ctx.SourceFile.Text(), n, false))
}
func callableAt(ctx rule.RuleContext, node *ast.Node) (callable, bool) {
	var name, fn *ast.Node
	switch node.Kind {
	case ast.KindVariableDeclaration:
		d := node.AsVariableDeclaration()
		name = d.Name()
		fn = d.Initializer
		if fn == nil || (!ast.IsArrowFunction(fn) && !ast.IsFunctionExpression(fn)) {
			return callable{}, false
		}
	case ast.KindFunctionDeclaration, ast.KindMethodDeclaration:
		name = node.Name()
		fn = node
	default:
		return callable{}, false
	}
	if name == nil || !ast.IsIdentifier(name) {
		return callable{}, false
	}
	c := callable{nameNode: name, name: name.Text(), words: words(name.Text()), body: sourceText(ctx, fn.Body()), construction: ast.IsObjectLiteralExpression(fn.Body()) || strings.HasPrefix(sourceText(ctx, fn.Body()), "({") || strings.Contains(sourceText(ctx, fn.Body()), "return {") || strings.Contains(sourceText(ctx, fn.Body()), "new ")}
	if fn.Type() != nil {
		c.returnType = sourceText(ctx, fn.Type())
	}
	for _, p := range fn.Parameters() {
		c.params = append(c.params, sourceText(ctx, p.Type()))
	}
	return c, true
}
func listeners(check func(*ast.Node)) rule.RuleListeners {
	return rule.RuleListeners{ast.KindVariableDeclaration: check, ast.KindFunctionDeclaration: check, ast.KindMethodDeclaration: check}
}
func first(xs []string) string {
	if len(xs) > 0 {
		return xs[0]
	}
	return ""
}
func last(xs []string) string {
	if len(xs) > 0 {
		return xs[len(xs)-1]
	}
	return ""
}
func shape(t string) string {
	l := strings.ToLower(t)
	switch {
	case strings.Contains(l, "=>"):
		return "callable"
	case strings.Contains(l, "boolean") || strings.Contains(l, " is "):
		return "boolean"
	case strings.Contains(l, "number"):
		return "number"
	case strings.Contains(l, "void"):
		return "void"
	case strings.Contains(l, "record<") || strings.Contains(l, "map<"):
		return "keyed"
	case strings.Contains(l, "readonlyarray") || strings.Contains(l, "array<") || strings.Contains(l, "set<") || strings.HasSuffix(l, "[]"):
		return "collection"
	case strings.Contains(l, "string"):
		return "string"
	case t != "":
		return "object"
	default:
		return "unknown"
	}
}
func cardinality(t string) string {
	l := strings.ToLower(t)
	if strings.Contains(l, "record<") || strings.Contains(l, "map<") {
		return "keyed"
	}
	if strings.Contains(l, "readonlyarray") || strings.Contains(l, "array<") || strings.Contains(l, "set<") || strings.HasSuffix(l, "[]") {
		return "many"
	}
	if strings.Contains(l, "undefined") || strings.Contains(l, "null") || strings.Contains(l, "option.") || strings.Contains(l, "result.") {
		return "optional-one"
	}
	if t != "" {
		return "one"
	}
	return "unknown"
}
func concept(t string) string {
	t = strings.TrimSpace(t)
	if i := strings.Index(t, "|"); i >= 0 {
		t = t[:i]
	}
	re := regexp.MustCompile(`[A-Za-z_$][\w$]*`)
	all := re.FindAllString(t, -1)
	skip := map[string]bool{"readonly": true, "ReadonlyArray": true, "Array": true, "Record": true, "Map": true, "Set": true, "Option": true, "Effect": true}
	for i := len(all) - 1; i >= 0; i-- {
		if !skip[all[i]] {
			return strings.ToLower(all[i])
		}
	}
	return ""
}
func claimedResult(ws []string) string {
	for i, w := range ws {
		if (w == "from" || w == "to" || w == "by") && i > 0 {
			return ws[i-1]
		}
	}
	return last(ws)
}
