package no_mutable_variable_declarations

import (
	"fmt"
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

const help = "Application code should declare multiple const values to represent each state instead of mutating one variable. When shared state genuinely evolves over time, use a Ref inside the Effect runtime instead of a let binding. An owned library kernel may use local mutation only under explicit project policy; this rule does not infer that exception."

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
