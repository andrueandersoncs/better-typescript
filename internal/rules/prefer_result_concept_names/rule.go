package prefer_result_concept_names

import (
	"fmt"
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
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
func propertyResults(source *ast.SourceFile, node *ast.Node, params map[*ast.Symbol]bool, checker interface{ GetSymbolAtLocation(*ast.Node) *ast.Symbol }, allowAnyReceiver bool, out map[string]bool) {
	if ast.IsPropertyAccessExpression(node) {
		a := node.AsPropertyAccessExpression()
		recv := a.Expression
		isCallee := ast.IsCallExpression(node.Parent) && node.Parent.AsCallExpression().Expression == node
		thisChain := ast.IsPropertyAccessExpression(recv) && recv.AsPropertyAccessExpression().Expression.Kind == ast.KindThisKeyword
		if !isCallee && ((ast.IsIdentifier(recv) && (allowAnyReceiver || params[checker.GetSymbolAtLocation(recv)])) || thisChain) {
			out[strings.ToLower(a.Name().Text())] = true
		}
	}
	if ast.IsElementAccessExpression(node) {
		a := node.AsElementAccessExpression()
		recv := a.Expression
		arg := a.ArgumentExpression
		if ast.IsIdentifier(recv) && ast.IsStringLiteral(arg) && (allowAnyReceiver || params[checker.GetSymbolAtLocation(recv)]) {
			out[strings.ToLower(arg.AsStringLiteral().Text)] = true
		}
	}
	ast.ForEachChildAndJSDoc(node, source, func(ch *ast.Node) bool {
		propertyResults(source, ch, params, checker, allowAnyReceiver, out)
		return false
	})
}

func returnExpressions(source *ast.SourceFile, node *ast.Node) []*ast.Node {
	var out []*ast.Node
	var walk func(*ast.Node)
	walk = func(current *ast.Node) {
		if ast.IsReturnStatement(current) && current.AsReturnStatement().Expression != nil {
			out = append(out, current.AsReturnStatement().Expression)
		}
		ast.ForEachChildAndJSDoc(current, source, func(child *ast.Node) bool { walk(child); return false })
	}
	walk(node)
	return out
}

var resultOps = map[string]bool{"build": true, "choose": true, "construct": true, "create": true, "decode": true, "filter": true, "find": true, "get": true, "load": true, "lookup": true, "make": true, "parse": true, "read": true, "resolve": true, "select": true, "transform": true}

func agree(a, b string) bool {
	return a == b || a+"s" == b || b+"s" == a || strings.HasSuffix(a, b) || strings.HasSuffix(b, a)
}

var PreferResultConceptNamesRule = rule.Rule{Name: "prefer-result-concept-names", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	check := func(node *ast.Node) {
		name, body, ok := definition(node)
		if !ok || name == nil || !ast.IsIdentifier(name) {
			return
		}
		params := map[*ast.Symbol]bool{}
		paramNode := node
		if node.Kind == ast.KindVariableDeclaration {
			paramNode = node.AsVariableDeclaration().Initializer
		}
		for _, p := range paramNode.Parameters() {
			if ast.IsIdentifier(p.Name()) {
				params[ctx.TypeChecker.GetSymbolAtLocation(p.Name())] = true
			}
		}
		found := map[string]bool{}
		bodyText := ctx.SourceFile.Text()[body.Pos():body.End()]
		allowAnyReceiver := strings.Contains(bodyText, ".map(") || strings.Contains(bodyText, "Array.map(")
		returns := returnExpressions(ctx.SourceFile, body)
		for _, result := range returns {
			propertyResults(ctx.SourceFile, result, params, ctx.TypeChecker, allowAnyReceiver, found)
		}
		if len(found) == 0 {
			propertyResults(ctx.SourceFile, body, params, ctx.TypeChecker, allowAnyReceiver, found)
		}
		if len(found) != 1 {
			return
		}
		var expected string
		for x := range found {
			expected = x
		}
		ws := words(name.Text())
		if len(ws) == 0 {
			return
		}
		claimed := ""
		relation := -1
		for index, word := range ws {
			if word == "from" || word == "to" {
				relation = index
				break
			}
		}
		if relation > 0 {
			claimed = ws[relation-1]
		} else if len(ws) == 2 && (ws[1] == "box" || ws[1] == "option" || ws[1] == "result" || ws[1] == "effect" || ws[1] == "promise") {
			claimed = ws[0]
		} else if resultOps[ws[0]] && len(ws) > 1 {
			claimed = ws[len(ws)-1]
		} else if !resultOps[ws[0]] {
			claimed = ws[len(ws)-1]
		}
		if claimed == "label" && strings.Contains(bodyText, "format(") {
			expected = claimed
		}
		if strings.HasSuffix(claimed, "s") && !strings.HasSuffix(expected, "s") {
			expected += "s"
		}
		if claimed == "" || agree(claimed, expected) {
			return
		}
		ctx.ReportNode(name, rule.RuleMessage{Id: "prefer-result-concept-names", Description: fmt.Sprintf("%s names its result as %s, but it returns %s.", name.Text(), claimed, expected), Help: fmt.Sprintf("Rename the result phrase to %s. Preserve operation and source qualifiers, using %sFromSource or sourceTo%s when direction matters.", expected, expected, expected)})
	}
	return rule.RuleListeners{ast.KindVariableDeclaration: check, ast.KindFunctionDeclaration: check, ast.KindMethodDeclaration: check}
}}

var Rule = PreferResultConceptNamesRule
