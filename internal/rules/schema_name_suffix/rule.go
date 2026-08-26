package schema_name_suffix

import (
	"path/filepath"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/checker"
)

func declaredByEffectSchema(symbol *ast.Symbol) bool {
	if symbol == nil {
		return false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		name := strings.ReplaceAll(file.FileName(), "\\", "/")
		base := filepath.Base(name)
		if base != "Schema.ts" && base != "Schema.d.ts" {
			continue
		}
		if strings.Contains(name, "/node_modules/effect/") || strings.Contains(name, "/packages/effect/src/") {
			return true
		}
	}
	return false
}

func hasProperties(properties map[string]*ast.Symbol, names ...string) bool {
	for _, name := range names {
		if properties[name] == nil {
			return false
		}
	}
	return true
}

func isEffectSchema(ctx rule.RuleContext, node *ast.Node) bool {
	properties := map[string]*ast.Symbol{}
	version := 0
	for _, property := range checker.Checker_getPropertiesOfType(ctx.TypeChecker, ctx.TypeChecker.GetTypeAtLocation(node)) {
		properties[property.Name] = property
		if !declaredByEffectSchema(property) {
			continue
		}
		if property.Name == "~effect/Schema/Schema" {
			version = 4
		}
		if strings.Contains(property.Name, "@TypeId@") {
			version = 3
		}
	}
	if version == 3 {
		return hasProperties(properties, "Type", "Encoded", "Context", "ast", "annotations", "pipe")
	}
	if version == 4 {
		return hasProperties(properties,
			"Type", "Encoded", "DecodingServices", "EncodingServices", "Rebuild", "ast", "Iso",
			"~type.parameters", "~type.make.in", "~type.make", "~type.constructor.default",
			"~type.mutability", "~type.optionality", "~encoded.mutability", "~encoded.optionality",
			"annotate", "annotateKey", "check", "rebuild", "make", "makeOption", "makeEffect", "pipe",
		)
	}
	return false
}

func report(ctx rule.RuleContext, name *ast.Node) {
	if name == nil || !ast.IsIdentifier(name) || strings.HasSuffix(name.Text(), "Schema") || !isEffectSchema(ctx, name) {
		return
	}
	current := name.Text()
	ctx.ReportNode(name, rule.RuleMessage{
		Id:          "schema-name-suffix",
		Description: current + " is an Effect Schema const without a Schema suffix.",
		Help:        "Rename it to " + current + "Schema and update its references. Name the decoded interface " + current + " and extend Schema.Schema.Type<typeof " + current + "Schema>.",
	})
}

func constBinding(node *ast.Node) bool {
	for current := node.Parent; current != nil; current = current.Parent {
		if ast.IsParameterDeclaration(current) || ast.IsFunctionLike(current) {
			return false
		}
		if ast.IsVariableDeclaration(current) {
			return current.Parent != nil && current.Parent.Flags&ast.NodeFlagsConst != 0
		}
	}
	return false
}

var Rule = rule.Rule{Name: "schema-name-suffix", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{
		ast.KindVariableDeclaration: func(node *ast.Node) {
			if node.Parent != nil && node.Parent.Flags&ast.NodeFlagsConst != 0 {
				report(ctx, node.Name())
			}
		},
		ast.KindBindingElement: func(node *ast.Node) {
			if constBinding(node) {
				report(ctx, node.Name())
			}
		},
	}
}}
