package prefer_implicit_return

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
)

var message = rule.RuleMessage{Id: "prefer-implicit-return", Description: "Avoid arrow function block bodies that only return a value.", Help: "Replace this with an implicit return by removing the return statement and function body braces. Wrap object literals in parentheses when needed."}

var PreferImplicitReturnRule = rule.Rule{Name: "prefer-implicit-return", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindArrowFunction: func(node *ast.Node) {
		fn := node.AsArrowFunction()
		if !ast.IsBlock(fn.Body) {
			return
		}
		block := fn.Body.AsBlock()
		if len(block.Statements.Nodes) != 1 {
			return
		}
		stmt := block.Statements.Nodes[0]
		if !ast.IsReturnStatement(stmt) || stmt.AsReturnStatement().Expression == nil {
			return
		}
		ctx.ReportNode(fn.Body, message)
	}}
}}

var Rule = PreferImplicitReturnRule
