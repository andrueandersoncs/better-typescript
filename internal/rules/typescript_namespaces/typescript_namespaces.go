package typescript_namespaces

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "typescriptNamespaces",
	Description: "Avoid TypeScript namespaces for Effect module organization.",
	Help:        "Export an ES module namespace projection or named values instead.",
}

var TypescriptNamespacesRule = rule.Rule{
	Name: "typescript-namespaces",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindModuleDeclaration: func(node *ast.Node) {
				declaration := node.AsModuleDeclaration()
				name := declaration.Name()
				if name == nil || name.Kind != ast.KindIdentifier || ast.IsGlobalScopeAugmentation(node) {
					return
				}
				ctx.ReportNode(name, message)
			},
		}
	},
}

var Rule = TypescriptNamespacesRule
