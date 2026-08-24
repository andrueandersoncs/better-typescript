package raw_fetch_abort_signal

import (
	"regexp"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/scanner"
)

var parameter = regexp.MustCompile(`(?:async\s*)?(?:\(\s*)?([A-Za-z_$][\w$]*)\s*(?:\)|=>)`)
var Rule = rule.Rule{Name: "raw-fetch-abort-signal", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		call := node.AsCallExpression()
		callee := strings.TrimSpace(scanner.GetTextOfNodeFromSourceText(ctx.SourceFile.Text(), call.Expression, false))
		if callee != "Effect.tryPromise" && callee != "tryPromise" {
			return
		}
		text := scanner.GetTextOfNodeFromSourceText(ctx.SourceFile.Text(), node, false)
		if !hasFetch(text) {
			return
		}
		name := ""
		if m := parameter.FindStringSubmatch(text); len(m) > 1 {
			name = m[1]
		}
		passes := false
		if name != "" {
			passes = strings.Contains(text, "signal: "+name) || strings.Contains(text, "signal:"+name) || (name == "signal" && regexp.MustCompile(`\{[^}]*\bsignal\b`).MatchString(text))
		}
		if !passes {
			ctx.ReportNode(node, rule.RuleMessage{Id: "raw-fetch-abort-signal", Description: "Pass Effect.tryPromise's AbortSignal to raw fetch.", Help: "Accept the tryPromise signal and pass it as fetch's init.signal."})
		}
	}}
}}

func hasFetch(text string) bool {
	return regexp.MustCompile(`(?:\bfetch|(?:globalThis|window|self)\.fetch)\s*\(`).MatchString(text)
}
