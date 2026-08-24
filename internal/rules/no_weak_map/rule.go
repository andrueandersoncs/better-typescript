package no_weak_map

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"strings"
)

var Rule = rule.Rule{
	Name: "no-weak-map",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		return rule.RuleListeners{ast.KindIdentifier: func(node *ast.Node) {
			if node.Text() != "WeakMap" {
				return
			}
			symbol := ctx.TypeChecker.GetSymbolAtLocation(node)
			if symbol != nil && isFirstParty(symbol) {
				return
			}
			ctx.ReportNode(node, rule.RuleMessage{Id: "no-weak-map", Description: "Avoid WeakMap because it keeps mutable state outside Effect.", Help: "Store immutable state in an Effect Ref instead. Use SynchronizedRef when updates are effectful, or SubscriptionRef when consumers need a stream of changes. Create the reference inside an Effect or Layer instead of retaining a module-level WeakMap."})
		}}
	},
}

func isFirstParty(symbol *ast.Symbol) bool {
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file != nil && !file.IsDeclarationFile && !strings.Contains(strings.ReplaceAll(file.FileName(), "\\", "/"), "/node_modules/") {
			return true
		}
	}
	return false
}
