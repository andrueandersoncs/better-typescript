package no_instanceof

import (
	"fmt"
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"strings"
)

const help = "Use a stable discriminant, an explicit structural type guard, or Schema.is with a structurally defined Schema such as Schema.Struct. Schema.is on Schema.Class retains constructor semantics, so it does not make a class check structural or cross-realm safe."

var Rule = rule.Rule{Name: "no-instanceof", Run: run}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindBinaryExpression: func(node *ast.Node) {
		expression := node.AsBinaryExpression()
		if expression.OperatorToken.Kind != ast.KindInstanceOfKeyword {
			return
		}
		symbol := ctx.TypeChecker.GetSymbolAtLocation(expression.Right)
		if symbol == nil {
			return
		}
		if symbol.Flags&ast.SymbolFlagsAlias != 0 {
			symbol = ctx.TypeChecker.GetAliasedSymbol(symbol)
		}
		if symbol == nil || !isFirstParty(symbol) {
			return
		}
		ctx.ReportNode(node, rule.RuleMessage{Id: "no-instanceof", Description: fmt.Sprintf("Avoid instanceof for the first-party class %q.", symbol.Name), Help: help})
	}}
}

func isFirstParty(symbol *ast.Symbol) bool {
	if len(symbol.Declarations) == 0 {
		return false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file != nil {
			name := strings.ReplaceAll(file.FileName(), "\\", "/")
			base := name[strings.LastIndex(name, "/")+1:]
			if !strings.Contains(name, "/node_modules/") && !(strings.HasPrefix(base, "lib.") && strings.HasSuffix(base, ".d.ts")) {
				return true
			}
		}
	}
	return false
}
