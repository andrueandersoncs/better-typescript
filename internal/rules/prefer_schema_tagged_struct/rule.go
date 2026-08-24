package prefer_schema_tagged_struct

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"strings"
)

var message = rule.RuleMessage{Id: "prefer-schema-tagged-struct", Description: "Prefer Schema.TaggedStruct when every field has a portable wire representation.", Help: "This Data.TaggedClass contains only wire-safe structural fields. When it crosses a reusable boundary, define it with Schema.TaggedStruct and a same-named decoded interface. Compose multiple boundary variants with Schema.TaggedUnion. Keep Data.TaggedClass for process-bound values such as streams, effects, functions, compiler objects, and live handles, and use Data.TaggedEnum for internal workflow decisions or state. Use Schema.TaggedErrorClass only for typed errors."}

func fromEffectTagged(ctx rule.RuleContext, n *ast.Node) bool {
	if !ast.IsPropertyAccessExpression(n) {
		return false
	}
	name := n.AsPropertyAccessExpression().Name()
	if name.Text() != "TaggedClass" {
		return false
	}
	s := ctx.TypeChecker.GetSymbolAtLocation(name)
	if s == nil {
		return false
	}
	for _, d := range s.Declarations {
		f := strings.ReplaceAll(ast.GetSourceFileOfNode(d).FileName(), "\\", "/")
		if strings.Contains(f, "/node_modules/effect/") || strings.HasSuffix(f, "/effect/src/Data.ts") || strings.HasSuffix(f, "/effect/dist/Data.d.ts") {
			return true
		}
	}
	return false
}
func tagged(ctx rule.RuleContext, node *ast.Node) (*ast.Node, bool) {
	c := node.AsClassDeclaration()
	if c.HeritageClauses == nil {
		return nil, false
	}
	for _, cl := range c.HeritageClauses.Nodes {
		for _, h := range cl.AsHeritageClause().Types.Nodes {
			e := h.AsExpressionWithTypeArguments()
			call := e.Expression
			if !ast.IsCallExpression(call) {
				continue
			}
			callee := call.AsCallExpression().Expression
			if fromEffectTagged(ctx, callee) {
				return h, true
			}
		}
	}
	return nil, false
}

var rejected = []string{"=>", "unknown", " any", "any ", "undefined", "void", "bigint", "symbol", "Stream.", "Effect.", "Layer.", "Context.", "Date", "Map<", "Set<"}
var PreferSchemaTaggedStructRule = rule.Rule{
	Name: "prefer-schema-tagged-struct",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		return rule.RuleListeners{ast.KindClassDeclaration: func(node *ast.Node) {
			h, ok := tagged(ctx, node)
			if !ok {
				return
			}
			text := ctx.SourceFile.Text()[h.Pos():h.End()]
			for _, bad := range rejected {
				if strings.Contains(text, bad) {
					return
				}
			}
			target := node.Name()
			if target == nil {
				target = node
			}
			ctx.ReportNode(target, message)
		}}
	},
}

var Rule = PreferSchemaTaggedStructRule
