package no_mutable_array_methods

import (
	"fmt"
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
	"strings"
)

const help = "Application code should use Effect's Array, HashMap, or HashSet modules, non-mutating methods, or spread syntax instead of manipulating a collection in place. An owned library kernel may use a local mutable builder only under explicit project policy; this rule does not infer that exception."

var arrayMethods = map[string]bool{"copyWithin": true, "fill": true, "pop": true, "push": true, "reverse": true, "shift": true, "sort": true, "splice": true, "unshift": true}
var typedArrayMethods = map[string]bool{"copyWithin": true, "fill": true, "reverse": true, "set": true, "sort": true}
var mutators = map[string]map[string]bool{
	"Map":               {"clear": true, "delete": true, "set": true},
	"Set":               {"add": true, "clear": true, "delete": true},
	"WeakMap":           {"delete": true, "set": true},
	"WeakSet":           {"add": true, "delete": true},
	"Int8Array":         typedArrayMethods,
	"Uint8Array":        typedArrayMethods,
	"Uint8ClampedArray": typedArrayMethods,
	"Int16Array":        typedArrayMethods,
	"Uint16Array":       typedArrayMethods,
	"Int32Array":        typedArrayMethods,
	"Uint32Array":       typedArrayMethods,
	"Float16Array":      typedArrayMethods,
	"Float32Array":      typedArrayMethods,
	"Float64Array":      typedArrayMethods,
	"BigInt64Array":     typedArrayMethods,
	"BigUint64Array":    typedArrayMethods,
}
var Rule = rule.Rule{Name: "no-mutable-array-methods", Run: run}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		callee := node.AsCallExpression().Expression
		if callee.Kind != ast.KindPropertyAccessExpression {
			return
		}
		access := callee.AsPropertyAccessExpression()
		name := access.Name().Text()
		owner := libOwner(ctx.TypeChecker.GetSymbolAtLocation(access.Name()), name)
		if arrayMethods[name] && ctx.TypeChecker.IsArrayLikeType(ctx.TypeChecker.GetTypeAtLocation(access.Expression)) {
			owner = "Array"
		}
		if owner == "" {
			return
		}
		ctx.ReportNode(node, rule.RuleMessage{Id: "no-mutable-array-methods", Description: fmt.Sprintf("Avoid mutating collections with %s.prototype.%s().", owner, name), Help: help})
	}}
}

// libOwner returns the built-in collection interface that declares a mutating method.
func libOwner(symbol *ast.Symbol, name string) string {
	if symbol == nil {
		return ""
	}
	for _, declaration := range symbol.Declarations {
		parent := declaration.Parent
		if parent == nil || !ast.IsInterfaceDeclaration(parent) || !mutators[parent.Name().Text()][name] {
			continue
		}
		file := ast.GetSourceFileOfNode(declaration)
		if file != nil && strings.HasPrefix(file.FileName()[strings.LastIndexAny(file.FileName(), "/\\")+1:], "lib.") {
			return parent.Name().Text()
		}
	}
	return ""
}
