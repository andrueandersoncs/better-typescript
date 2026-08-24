package prefer_effect_array

import (
	"fmt"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
)

var arrayMethods = map[string]bool{"at": true, "concat": true, "copyWithin": true, "entries": true, "every": true, "fill": true, "filter": true, "find": true, "findIndex": true, "findLast": true, "findLastIndex": true, "flat": true, "flatMap": true, "forEach": true, "includes": true, "indexOf": true, "join": true, "keys": true, "lastIndexOf": true, "map": true, "pop": true, "push": true, "reduce": true, "reduceRight": true, "reverse": true, "shift": true, "slice": true, "some": true, "sort": true, "splice": true, "toLocaleString": true, "toReversed": true, "toSorted": true, "toSpliced": true, "toString": true, "unshift": true, "values": true, "with": true}
var Rule = rule.Rule{Name: "prefer-effect-array", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		callee := unwrap(node.AsCallExpression().Expression)
		if !ast.IsPropertyAccessExpression(callee) {
			return
		}
		method := propertyName(callee)
		if !arrayMethods[method] {
			return
		}
		receiver := callee.AsPropertyAccessExpression().Expression
		if !isArrayLike(ctx.TypeChecker, ctx.TypeChecker.GetTypeAtLocation(receiver), map[*checker.Type]bool{}) {
			return
		}
		ctx.ReportNode(node, rule.RuleMessage{Id: "prefer-effect-array", Description: fmt.Sprintf("Avoid Array.prototype.%s().", method), Help: "Prefer Effect's Array module — define the array as a const and call Array.every(values, Boolean), Array.map(values, f), Array.filter(values, f), or the matching Array.* helper — instead of invoking Array.prototype methods directly on array values."})
	}}
}}

func isArrayLike(c *checker.Checker, t *checker.Type, seen map[*checker.Type]bool) bool {
	if t == nil || seen[t] {
		return false
	}
	seen[t] = true
	if c.IsArrayType(t) || checker.IsTupleType(t) {
		return true
	}
	for _, part := range append(utils.UnionTypeParts(t), utils.IntersectionTypeParts(t)...) {
		if part != t && isArrayLike(c, part, seen) {
			return true
		}
	}
	apparent := c.GetApparentType(t)
	return apparent != nil && apparent != t && isArrayLike(c, apparent, seen)
}
func propertyName(node *ast.Node) string {
	name := node.Name()
	if name != nil && ast.IsIdentifier(name) {
		return name.AsIdentifier().Text
	}
	return ""
}
func unwrap(node *ast.Node) *ast.Node {
	for node != nil && ast.IsParenthesizedExpression(node) {
		node = node.Expression()
	}
	return node
}

var PreferEffectArrayRule = Rule
