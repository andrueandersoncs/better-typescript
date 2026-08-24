package prefer_effect_index_access

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
)

var Rule = rule.Rule{Name: "prefer-effect-index-access", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindElementAccessExpression: func(node *ast.Node) {
		receiver := node.AsElementAccessExpression().Expression
		if !isArrayLike(ctx.TypeChecker, ctx.TypeChecker.GetTypeAtLocation(receiver), map[*checker.Type]bool{}) {
			return
		}
		ctx.ReportNode(node, rule.RuleMessage{Id: "prefer-effect-index-access", Description: "Avoid direct array and tuple index access.", Help: "Use Array.get(collection, index) to represent a potentially absent array element, or Array.headNonEmpty when a collection is proven non-empty. For a fixed-length tuple, use Tuple.get(tuple, index) to preserve its positional type."})
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

var PreferEffectIndexAccessRule = Rule
