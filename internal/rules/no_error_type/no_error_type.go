package no_error_type

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
	"path/filepath"
	"strings"
)

var avoidBuiltinErrorMessage = rule.RuleMessage{
	Id:          "noErrorType",
	Description: "Avoid the built-in Error type.",
	Help:        "Use a specific tagged error type for known failures, preserve the caller's error type with a type parameter, or use unknown at an untyped boundary.",
}

func errorTypeName(typeName *ast.Node) *ast.Node {
	if ast.IsIdentifier(typeName) {
		if typeName.Text() == "Error" {
			return typeName
		}
		return nil
	}

	if !ast.IsQualifiedName(typeName) {
		return nil
	}

	qualifiedName := typeName.AsQualifiedName()
	if qualifiedName.Right.Text() != "Error" {
		return nil
	}

	return qualifiedName.Right
}

func isBuiltInErrorSymbol(symbol *ast.Symbol) bool {
	if symbol == nil || symbol.Name != "Error" {
		return false
	}
	if len(symbol.Declarations) == 0 {
		return symbol.Flags&ast.SymbolFlagsTransient != 0
	}
	for _, declaration := range symbol.Declarations {
		current := declaration
		for current.Parent != nil {
			current = current.Parent
		}
		if ast.IsSourceFile(current) {
			name := strings.ReplaceAll(current.AsSourceFile().FileName(), "\\", "/")
			base := filepath.Base(name)
			if strings.HasPrefix(base, "lib.") && strings.HasSuffix(base, ".d.ts") {
				return true
			}
		}
	}
	return false
}

var NoErrorTypeRule = rule.Rule{
	Name: "no-error-type",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindTypeReference: func(node *ast.Node) {
				typeName := errorTypeName(node.AsTypeReferenceNode().TypeName)
				if typeName != nil && isBuiltInErrorSymbol(ctx.TypeChecker.GetSymbolAtLocation(typeName)) {
					ctx.ReportNode(typeName, avoidBuiltinErrorMessage)
				}
			},
		}
	},
}
