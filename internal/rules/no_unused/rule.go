package no_unused

import (
	"context"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/compiler"
)

var Rule = rule.Rule{
	Name: "no-unused",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		message := rule.RuleMessage{Id: "no-unused", Description: "Avoid unused imports, declarations, and parameters.", Help: "Delete the unused import, variable, function, type, or parameter. If a parameter is required by a signature but intentionally unused, prefix its name with an underscore."}
		for _, diagnostic := range compiler.Program_GetSemanticDiagnosticsWithChecker(ctx.Program, context.Background(), ctx.TypeChecker, ctx.SourceFile) {
			if diagnostic.File() != ctx.SourceFile || !unusedCode(diagnostic.Code()) {
				continue
			}
			ctx.ReportRange(diagnostic.Loc(), message)
		}
		return rule.RuleListeners{}
	},
}

func unusedCode(code int32) bool {
	switch code {
	case 6133, 6192, 6196, 6138, 6198, 6199, 6205:
		return true
	}
	return false
}
