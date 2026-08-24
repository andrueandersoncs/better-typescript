package prefer_option_match

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

var message = rule.RuleMessage{Id: "prefer-option-match", Description: "Avoid using Option.isSome/isNone in a ternary to unwrap an Option.", Help: "Use Option.match(option, { onNone: () => fallback, onSome: (value) => ... }) instead of manually checking and accessing .value."}

func containsValue(source *ast.SourceFile, node *ast.Node, name string) bool {
	if ast.IsPropertyAccessExpression(node) {
		a := node.AsPropertyAccessExpression()
		if a.Name().Text() == "value" && ast.IsIdentifier(a.Expression) && a.Expression.Text() == name {
			return true
		}
	}
	found := false
	ast.ForEachChildAndJSDoc(node, source, func(child *ast.Node) bool {
		if containsValue(source, child, name) {
			found = true
			return true
		}
		return false
	})
	return found
}

var PreferOptionMatchRule = rule.Rule{Name: "prefer-option-match", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindConditionalExpression: func(node *ast.Node) {
		c := node.AsConditionalExpression()
		cond := ast.SkipParentheses(c.Condition)
		if !ast.IsCallExpression(cond) {
			return
		}
		call := cond.AsCallExpression()
		if !ast.IsPropertyAccessExpression(call.Expression) || len(call.Arguments.Nodes) == 0 {
			return
		}
		access := call.Expression.AsPropertyAccessExpression()
		if !ast.IsIdentifier(access.Expression) || access.Expression.Text() != "Option" {
			return
		}
		guard := access.Name().Text()
		if guard != "isSome" && guard != "isNone" {
			return
		}
		arg := call.Arguments.Nodes[0]
		if !ast.IsIdentifier(arg) {
			return
		}
		branch := c.WhenTrue
		if guard == "isNone" {
			branch = c.WhenFalse
		}
		if containsValue(ctx.SourceFile, branch, arg.Text()) {
			ctx.ReportNode(node, message)
		}
	}}
}}

var Rule = PreferOptionMatchRule
