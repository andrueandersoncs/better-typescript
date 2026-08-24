package handrolled_ttl_cache

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"regexp"
	"strings"
)

var message = rule.RuleMessage{
	Id:          "handrolled-ttl-cache",
	Description: "Avoid a hand-rolled TTL Map cache when Effect Cache fits.",
	Help:        "Use Cache.make or Cache.makeWith when its lifecycle and eviction semantics fit.",
}

var expiresPattern = regexp.MustCompile(`\bexpires(?:At|On|In)?\b`)
var Rule = rule.Rule{Name: "handrolled-ttl-cache", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindNewExpression: func(node *ast.Node) {
		expression := node.AsNewExpression().Expression
		if !ast.IsIdentifier(expression) || expression.Text() != "Map" {
			return
		}
		source := ctx.SourceFile.Text()
		if expiresPattern.MatchString(source) && strings.Contains(source, "Date.now") && strings.Contains(source, ".delete(") {
			ctx.ReportNode(expression, message)
		}
	}}
}}
