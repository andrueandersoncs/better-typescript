package unsafe_casts

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/checker"
)

var message = rule.RuleMessage{
	Id:          "unsafeCasts",
	Description: "Avoid unchecked `as any` assertions in Effect code.",
	Help:        "Model the missing invariant with Schema decoding, a branded type, or a verified narrowing predicate.",
}

var unknownMessage = rule.RuleMessage{
	Id:          "unsafeUnknownCast",
	Description: "Avoid asserting an `unknown` value to a concrete type.",
	Help:        "Change the algorithm or data structure so the value keeps its type, or prove the target with Schema decoding or a verified narrowing predicate.",
}

var UnsafeCastsRule = rule.Rule{
	Name: "unsafe-casts",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		check := func(node *ast.Node) {
			typeNode := node.Type()
			if typeNode == nil {
				return
			}
			if typeNode.Kind == ast.KindAnyKeyword {
				ctx.ReportNode(typeNode, message)
				return
			}
			sourceType := ctx.TypeChecker.GetTypeAtLocation(node.Expression())
			targetType := ctx.TypeChecker.GetTypeAtLocation(typeNode)
			if sourceType == nil || targetType == nil || checker.Type_flags(sourceType)&checker.TypeFlagsUnknown == 0 {
				return
			}
			if checker.Type_flags(targetType)&(checker.TypeFlagsUnknown|checker.TypeFlagsAny) != 0 {
				return
			}
			ctx.ReportNode(typeNode, unknownMessage)
		}
		return rule.RuleListeners{ast.KindAsExpression: check, ast.KindTypeAssertionExpression: check}
	},
}

var Rule = UnsafeCastsRule
