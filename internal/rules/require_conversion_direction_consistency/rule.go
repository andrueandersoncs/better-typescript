package require_conversion_direction_consistency

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/scanner"
)

var conversion = map[string]bool{"decode": true, "deserialize": true, "encode": true, "format": true, "parse": true, "serialize": true, "stringify": true, "transform": true}
var Rule = rule.Rule{Name: "require-conversion-direction-consistency", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return listeners(func(node *ast.Node) {
		c, ok := callableAt(ctx, node)
		if !ok || len(c.params) == 0 || shape(c.returnType) == "boolean" {
			return
		}
		op := first(c.words)
		if !conversion[op] && op != "" {
			hasRelation := false
			for _, w := range c.words {
				if w == "from" || w == "to" {
					hasRelation = true
				}
			}
			if !hasRelation {
				return
			}
		}
		source, result := concept(c.params[0]), concept(c.returnType)
		report := func(axis, claimed, expected string) {
			if claimed == "" || expected == "" || claimed == expected {
				return
			}
			desc := fmt.Sprintf("%s names its conversion %s as %s, but ", c.name, axis, claimed)
			help := ""
			if axis == "result" {
				desc += fmt.Sprintf("it returns %s.", expected)
				help = fmt.Sprintf("Rename the result phrase to %s, or return a value whose concept is %s.", expected, claimed)
			} else {
				desc += fmt.Sprintf("its source is %s.", expected)
				help = fmt.Sprintf("Rename the source phrase to %s, or accept a parameter whose concept is %s.", expected, claimed)
			}
			ctx.ReportNode(c.nameNode, rule.RuleMessage{Id: "require-conversion-direction-consistency", Description: desc, Help: help})
		}
		for i, w := range c.words {
			if w == "from" && i > 0 && i+1 < len(c.words) {
				if c.words[i-1] != result && c.words[i+1] != source {
					report("source", c.words[i+1], source)
					report("result", c.words[i-1], result)
				}
				return
			}
			if w == "to" && i > 0 && i+1 < len(c.words) {
				if c.words[i-1] != source && c.words[i+1] != result {
					report("source", c.words[i-1], source)
					report("result", c.words[i+1], result)
				}
				return
			}
		}
		if len(c.words) < 2 {
			return
		}
		claimed := c.words[1]
		if op == "parse" || op == "decode" {
			report("result", claimed, result)
		} else if op == "encode" || op == "format" || op == "serialize" || op == "stringify" {
			report("source", claimed, source)
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
	body := fn.Body()
	bodyText := sourceText(ctx, body)
	c := callable{nameNode: name, name: name.Text(), words: words(name.Text()), body: bodyText, construction: body != nil && (ast.IsObjectLiteralExpression(body) || strings.HasPrefix(bodyText, "({") || strings.Contains(bodyText, "return {") || strings.Contains(bodyText, "new "))}
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
