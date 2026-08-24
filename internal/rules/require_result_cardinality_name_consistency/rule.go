package require_result_cardinality_name_consistency

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/scanner"
)

var neutral = map[string]bool{"advice": true, "config": true, "data": true, "evidence": true, "metadata": true, "news": true, "series": true, "species": true, "status": true}

func plural(w string) bool {
	if neutral[w] || strings.HasSuffix(w, "ss") || strings.HasSuffix(w, "us") || strings.HasSuffix(w, "is") || strings.HasSuffix(w, "ics") {
		return false
	}
	return w == "children" || w == "people" || (len(w) > 1 && strings.HasSuffix(w, "s"))
}
func singularize(w string) string {
	if w == "children" {
		return "child"
	}
	if w == "people" {
		return "person"
	}
	if strings.HasSuffix(w, "ies") {
		return strings.TrimSuffix(w, "ies") + "y"
	}
	if strings.HasSuffix(w, "ses") || strings.HasSuffix(w, "xes") || strings.HasSuffix(w, "zes") || strings.HasSuffix(w, "ches") || strings.HasSuffix(w, "shes") {
		return w[:len(w)-2]
	}
	return strings.TrimSuffix(w, "s")
}
func pluralize(w string) string {
	if w == "child" {
		return "children"
	}
	if w == "person" {
		return "people"
	}
	if strings.HasSuffix(w, "y") {
		return strings.TrimSuffix(w, "y") + "ies"
	}
	if strings.HasSuffix(w, "s") || strings.HasSuffix(w, "x") || strings.HasSuffix(w, "z") || strings.HasSuffix(w, "ch") || strings.HasSuffix(w, "sh") {
		return w + "es"
	}
	return w + "s"
}

var Rule = rule.Rule{Name: "require-result-cardinality-name-consistency", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return listeners(func(node *ast.Node) {
		c, ok := callableAt(ctx, node)
		if !ok {
			return
		}
		claimed := claimedResult(c.words)
		card := cardinality(c.returnType)
		if (card == "one" || card == "optional-one") && plural(claimed) && shape(c.returnType) != "object" {
			ctx.ReportNode(c.nameNode, rule.RuleMessage{Id: "require-result-cardinality-name-consistency", Description: fmt.Sprintf("%s names its result as plural %s, but returns %s.", c.name, claimed, card), Help: fmt.Sprintf("Rename the result noun to singular %s so the name matches a single returned value.", singularize(claimed))})
			return
		}
		if (card == "many" || card == "keyed") && !plural(claimed) && !neutral[claimed] {
			ctx.ReportNode(c.nameNode, rule.RuleMessage{Id: "require-result-cardinality-name-consistency", Description: fmt.Sprintf("%s names its result as singular %s, but returns %s.", c.name, claimed, card), Help: fmt.Sprintf("Rename the result noun to plural %s so the name matches the collection result.", pluralize(claimed))})
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
