package no_duplicate_if_bodies

import (
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/scanner"
)

func unwrapSingleStatementBlock(statement *ast.Node) *ast.Node {
	if ast.IsBlock(statement) && len(statement.Statements()) == 1 {
		return statement.Statements()[0]
	}
	return statement
}

func fingerprint(ctx rule.RuleContext, statement *ast.Node) string {
	body := unwrapSingleStatementBlock(statement)
	r := utils.TrimNodeTextRange(ctx.SourceFile, body)
	tokenScanner := scanner.NewScanner()
	tokenScanner.SetText(ctx.SourceFile.Text()[r.Pos():r.End()])
	tokens := []string{}
	for kind := tokenScanner.Scan(); kind != ast.KindEndOfFile; kind = tokenScanner.Scan() {
		if kind != ast.KindSemicolonToken {
			tokens = append(tokens, tokenScanner.TokenText())
		}
	}
	return strings.Join(tokens, " ")
}

func alwaysExitsScope(statement *ast.Node) bool {
	if ast.IsBlock(statement) {
		statements := statement.Statements()
		return len(statements) > 0 && alwaysExitsScope(statements[len(statements)-1])
	}
	return statement.Kind == ast.KindBreakStatement || statement.Kind == ast.KindContinueStatement || statement.Kind == ast.KindReturnStatement || statement.Kind == ast.KindThrowStatement
}

func conditionText(ctx rule.RuleContext, statement *ast.Node) string {
	expression := statement.AsIfStatement().Expression
	r := utils.TrimNodeTextRange(ctx.SourceFile, expression)
	return ctx.SourceFile.Text()[r.Pos():r.End()]
}

func reportDuplicate(ctx rule.RuleContext, previous *ast.Node, current *ast.Node) {
	combined := conditionText(ctx, previous) + " || " + conditionText(ctx, current)
	ctx.ReportNode(current, rule.RuleMessage{
		Id:          "noDuplicateIfBodies",
		Description: "Avoid if branches that repeat the body of the branch before them.",
		Help:        "These branches are pseudo-duplicates: the bodies are identical and only the conditions differ. Combine them into a single branch: if (" + combined + ") { ... }.",
	})
}

func checkIf(ctx rule.RuleContext, node *ast.Node) {
	current := node.AsIfStatement()
	if current.ElseStatement == nil && ast.IsBlock(node.Parent) {
		statements := node.Parent.Statements()
		for index, statement := range statements {
			if statement != node || index == 0 {
				continue
			}
			previousNode := statements[index-1]
			if ast.IsIfStatement(previousNode) {
				previous := previousNode.AsIfStatement()
				if previous.ElseStatement == nil && fingerprint(ctx, previous.ThenStatement) == fingerprint(ctx, current.ThenStatement) && alwaysExitsScope(current.ThenStatement) {
					reportDuplicate(ctx, previousNode, node)
				}
			}
			return
		}
	}
	if ast.IsIfStatement(node.Parent) && node.Parent.AsIfStatement().ElseStatement == node {
		parent := node.Parent
		if fingerprint(ctx, parent.AsIfStatement().ThenStatement) == fingerprint(ctx, current.ThenStatement) {
			reportDuplicate(ctx, parent, node)
		}
	}
}

var NoDuplicateIfBodiesRule = rule.Rule{
	Name: "no-duplicate-if-bodies",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{ast.KindIfStatement: func(node *ast.Node) { checkIf(ctx, node) }}
	},
}
