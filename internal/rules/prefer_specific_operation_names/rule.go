package prefer_specific_operation_names

import (
	"fmt"
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"regexp"
	"strings"
)

var wordPattern = regexp.MustCompile(`[A-Z]+(?:[A-Z][a-z]|\d|$)|[A-Z]?[a-z]+|\d+`)

func words(s string) []string {
	m := wordPattern.FindAllString(s, -1)
	for i := range m {
		m[i] = strings.ToLower(m[i])
	}
	return m
}
func definition(node *ast.Node) (name, body *ast.Node, ok bool) {
	switch node.Kind {
	case ast.KindVariableDeclaration:
		d := node.AsVariableDeclaration()
		if d.Initializer != nil && (ast.IsArrowFunction(d.Initializer) || ast.IsFunctionExpression(d.Initializer)) {
			return d.Name(), d.Initializer.Body(), true
		}
	case ast.KindFunctionDeclaration, ast.KindMethodDeclaration:
		return node.Name(), node.Body(), node.Body() != nil
	}
	return nil, nil, false
}

type roleEvidence struct{ role, operation string }

func evidence(source *ast.SourceFile, n *ast.Node, out map[string]string) {
	if ast.IsCallExpression(n) {
		c := n.AsCallExpression()
		callee := c.Expression
		if ast.IsPropertyAccessExpression(callee) {
			callee = callee.AsPropertyAccessExpression().Name()
		}
		if ast.IsIdentifier(callee) {
			w := words(callee.Text())
			if len(w) > 0 {
				op := w[0]
				switch op {
				case "decode", "deserialize", "encode", "format", "parse", "serialize", "stringify", "transform":
					out["conversion"] = op
				case "build", "construct", "create", "make", "new", "of":
					out["construction"] = op
				case "at", "find", "get", "head", "last", "load", "lookup", "read":
					out["lookup"] = op
				case "aggregate", "average", "count", "every", "group", "index", "length", "max", "min", "reduce", "size", "some", "sum", "total":
					out["aggregation"] = op
				case "choose", "filter", "map", "select":
					out["projection"] = op
				case "delete", "publish", "remove", "save", "send", "set", "update", "write":
					out["command"] = op
				}
			}
		}
	}
	if ast.IsPropertyAccessExpression(n) {
		isCallee := ast.IsCallExpression(n.Parent) && n.Parent.AsCallExpression().Expression == n
		if !isCallee {
			property := n.AsPropertyAccessExpression().Name().Text()
			if prior, ok := out["projection"]; ok && prior != property {
				out["projection"] = ""
			} else if !ok {
				out["projection"] = property
			}
		}
	}
	if ast.IsBinaryExpression(n) && n.AsBinaryExpression().OperatorToken.Kind == ast.KindEqualsToken {
		out["command"] = "execute"
	}
	ast.ForEachChildAndJSDoc(n, source, func(ch *ast.Node) bool { evidence(source, ch, out); return false })
}

var vagueSet = map[string]bool{"do": true, "execute": true, "handle": true, "manage": true, "process": true, "run": true}

func capitalize(s string) string {
	if s == "" {
		return s
	}
	return strings.ToUpper(s[:1]) + s[1:]
}

var PreferSpecificOperationNamesRule = rule.Rule{Name: "prefer-specific-operation-names", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	check := func(node *ast.Node) {
		name, body, ok := definition(node)
		if !ok || name == nil || !ast.IsIdentifier(name) {
			return
		}
		ws := words(name.Text())
		var vague string
		for _, w := range ws {
			if vagueSet[w] {
				vague = w
				break
			}
		}
		if vague == "" {
			return
		}
		for _, w := range ws {
			if w == "handler" || w == "callback" || w == "listener" || w == "subscriber" {
				return
			}
		}
		if len(ws) == 1 && (ws[0] == "main" || ws[0] == "start" || ws[0] == "init" || ws[0] == "bootstrap") {
			return
		}
		if vague == "handle" && len(ws) > 1 {
			events := map[string]bool{"click": true, "change": true, "submit": true, "message": true, "error": true, "load": true}
			if events[ws[len(ws)-1]] {
				return
			}
		}
		roles := map[string]string{}
		evidence(ctx.SourceFile, body, roles)
		if operation, ok := roles["projection"]; ok && operation == "" {
			delete(roles, "projection")
		}
		if operation, ok := roles["projection"]; ok && operation != "select" && operation != "map" && operation != "filter" && operation != "choose" {
			roles["projection"] = "select"
		}
		if _, ok := roles["construction"]; ok {
			delete(roles, "conversion")
			delete(roles, "projection")
		}
		if _, ok := roles["aggregation"]; ok {
			delete(roles, "projection")
		}
		if _, ok := roles["command"]; ok {
			delete(roles, "projection")
		}
		if _, ok := roles["lookup"]; ok {
			delete(roles, "projection")
		}
		if _, ok := roles["conversion"]; ok {
			delete(roles, "projection")
		}
		if len(roles) != 1 {
			return
		}
		var role, op string
		for r, o := range roles {
			role, op = r, o
		}
		fallback := map[string]string{"aggregation": "aggregate", "command": "execute", "construction": "make", "conversion": "convert", "lookup": "get", "projection": "select"}
		if op == "" {
			op = fallback[role]
		}
		renamed := name.Text()
		i := strings.Index(strings.ToLower(renamed), vague)
		if i < 0 {
			return
		}
		replacement := op
		if i > 0 {
			replacement = capitalize(op)
		}
		renamed = renamed[:i] + replacement + renamed[i+len(vague):]
		if renamed == name.Text() {
			return
		}
		ctx.ReportNode(name, rule.RuleMessage{Id: "prefer-specific-operation-names", Description: fmt.Sprintf("%s uses the vague operation %s, but its body has a unique %s role.", name.Text(), vague, role), Help: fmt.Sprintf("Rename to %s, preserving the known object or result noun.", renamed)})
	}
	return rule.RuleListeners{ast.KindVariableDeclaration: check, ast.KindFunctionDeclaration: check, ast.KindMethodDeclaration: check}
}}

var Rule = PreferSpecificOperationNamesRule
