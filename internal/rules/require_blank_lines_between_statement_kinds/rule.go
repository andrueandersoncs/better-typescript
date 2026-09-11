package require_blank_lines_between_statement_kinds

import (
	"regexp"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/scanner"
)

var blankLine = regexp.MustCompile(`\n[ \t]*\r?\n`)

var message = rule.RuleMessage{
	Id:          "require-blank-lines-between-statement-kinds",
	Description: "Different statement kinds must have a blank line between them.",
	Help:        "Insert an empty line before this statement. Keep adjacent single-line statements together only when they have the same syntax kind.",
}

func checkStatements(ctx rule.RuleContext, node *ast.Node) {
	statements := node.Statements()
	if len(statements) < 2 {
		return
	}
	text := ctx.SourceFile.Text()
	previous := statements[0]
	start := scanner.GetTokenPosOfNode(previous, ctx.SourceFile, false)
	previousMultiline := strings.Contains(text[start:previous.End()], "\n")
	for _, current := range statements[1:] {
		start := scanner.GetTokenPosOfNode(current, ctx.SourceFile, false)
		multiline := strings.Contains(text[start:current.End()], "\n")
		// The multiline spacing rule owns boundaries with a multiline neighbor.
		if previous.Kind != current.Kind && !previousMultiline && !multiline && !blankLine.MatchString(text[previous.End():start]) {
			ctx.ReportNode(current, message)
		}
		previous = current
		previousMultiline = multiline
	}
}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	check := func(node *ast.Node) { checkStatements(ctx, node) }
	return rule.RuleListeners{
		ast.KindEndOfFile: func(_ *ast.Node) {
			checkStatements(ctx, ctx.SourceFile.AsNode())
		},
		ast.KindBlock:         check,
		ast.KindModuleBlock:   check,
		ast.KindCaseClause:    check,
		ast.KindDefaultClause: check,
	}
}

var Rule = rule.Rule{Name: "require-blank-lines-between-statement-kinds", Run: run}
