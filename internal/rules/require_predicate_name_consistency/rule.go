package require_predicate_name_consistency

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/scanner"
)

var predicates = map[string]bool{"can": true, "contain": true, "contains": true, "does": true, "equal": true, "equals": true, "every": true, "exist": true, "exists": true, "has": true, "include": true, "includes": true, "is": true, "should": true, "some": true}
var incompatible = map[string]bool{"build": true, "construct": true, "create": true, "decode": true, "delete": true, "deserialize": true, "encode": true, "find": true, "format": true, "get": true, "load": true, "lookup": true, "make": true, "parse": true, "publish": true, "read": true, "remove": true, "resolve": true, "save": true, "select": true, "send": true, "serialize": true, "set": true, "transform": true, "update": true, "write": true}
var Rule = rule.Rule{Name: "require-predicate-name-consistency", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return listeners(func(node *ast.Node) {
		c, ok := callableAt(ctx, node)
		if !ok {
			return
		}
		op := first(c.words)
		claim := predicates[op] && !(len(c.words) == 1 && (op == "every" || op == "some"))
		if (op == "starts" || op == "ends") && len(c.words) > 1 && c.words[1] == "with" {
			claim = true
		}
		s := shape(c.returnType)
		if claim && s != "boolean" && !(len(c.words) == 1 && (op == "some" || op == "none")) {
			ctx.ReportNode(c.nameNode, rule.RuleMessage{Id: "require-predicate-name-consistency", Description: fmt.Sprintf("%s claims a predicate, but its result shape is %s.", c.name, s), Help: "Rename the function so its operation matches the non-boolean result, or return a boolean or type-predicate result."})
			return
		}
		if s == "boolean" && !claim && incompatible[op] {
			ctx.ReportNode(c.nameNode, rule.RuleMessage{Id: "require-predicate-name-consistency", Description: fmt.Sprintf("%s returns boolean, but claims the %s operation.", c.name, op), Help: "Rename with predicate vocabulary such as is, has, can, should, does, equal, contain, include, match, exist, every, some, startsWith, or endsWith."})
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
