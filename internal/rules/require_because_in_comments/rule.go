package require_because_in_comments

import (
	"regexp"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/core"
)

var becauseWord = regexp.MustCompile(`(?i)(^|[^\pL\pM\pN_])because([^\pL\pM\pN_]|$)`)
var message = rule.RuleMessage{Id: "require-because-in-comments", Description: `Comments must explain why using the word "because".`, Help: "Delete the comment if it does not explain a reason."}
var Rule = rule.Rule{Name: "require-because-in-comments", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindEndOfFile: func(_ *ast.Node) {
		for _, c := range comments(ctx.SourceFile.Text()) {
			if !becauseWord.MatchString(c.text) {
				ctx.ReportRange(core.NewTextRange(c.start, c.end), message)
			}
		}
	}}
}}

type comment struct {
	start, end int
	text       string
}

func comments(text string) []comment {
	out := []comment{}
	quote := byte(0)
	template := false
	templateExpr := 0
	for i := 0; i < len(text); {
		c := text[i]
		if quote != 0 {
			if c == '\\' {
				i += 2
				continue
			}
			if c == quote {
				quote = 0
			}
			i++
			continue
		}
		if template && templateExpr == 0 {
			if c == '\\' {
				i += 2
				continue
			}
			if c == '`' {
				template = false
				i++
				continue
			}
			if c == '$' && i+1 < len(text) && text[i+1] == '{' {
				templateExpr = 1
				i += 2
				continue
			}
			i++
			continue
		}
		if c == '\'' || c == '"' {
			quote = c
			i++
			continue
		}
		if c == '`' {
			template = true
			i++
			continue
		}
		if templateExpr > 0 {
			if c == '{' {
				templateExpr++
			}
			if c == '}' {
				templateExpr--
				i++
				continue
			}
		}
		if c == '/' && i+1 < len(text) && text[i+1] == '/' {
			start := i
			i += 2
			for i < len(text) && text[i] != '\n' && text[i] != '\r' {
				i++
			}
			out = append(out, comment{start, i, text[start:i]})
			continue
		}
		if c == '/' && i+1 < len(text) && text[i+1] == '*' {
			start := i
			i += 2
			for i+1 < len(text) && (text[i] != '*' || text[i+1] != '/') {
				i++
			}
			if i+1 < len(text) {
				i += 2
			}
			out = append(out, comment{start, i, text[start:i]})
			continue
		}
		i++
	}
	return out
}
