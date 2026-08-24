package no_mutable_variable_declarations

import (
	"fmt"
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

const help = "Declare multiple const values to represent each state instead of mutating a single variable, and use immutable values that are not reassigned. When the value must genuinely evolve over time (a module-level counter, a cell shared across closures), hold it in a Ref inside the Effect runtime instead of a let binding."

var Rule = rule.Rule{Name: "no-mutable-variable-declarations", Run: run}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindVariableDeclarationList: func(node *ast.Node) {
		kind := ""
		switch node.Flags & ast.NodeFlagsBlockScoped {
		case 0:
			kind = "var"
		case ast.NodeFlagsLet:
			kind = "let"
		}
		if kind != "" {
			ctx.ReportNode(node, rule.RuleMessage{Id: "no-mutable-variable-declarations", Description: fmt.Sprintf("Avoid declaring mutable variables with %s.", kind), Help: help})
		}
	}}
}
