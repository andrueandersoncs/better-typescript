package require_export_jsdoc

import (
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/parser"
)

var message = rule.RuleMessage{
	Id:          "requireExportJSDoc",
	Description: `Exports need structured JSDoc with a "Scope: public" or "Scope: private" section.`,
	Help:        `Private exports must only declare their scope. Public exports also need a concise, specific scenario in the "When to use:" section. Wrap that section so no source line exceeds 80 columns. Public exports also need a complete, minimal TypeScript code example in a fenced "Example:" section. Do not use console.log. Show ordinary use of the export: assign it, pass it, or return it.`,
}

func normalizeLine(line string) string {
	line = strings.TrimSpace(line)
	if strings.HasPrefix(line, "*") {
		line = strings.TrimSpace(line[1:])
	}
	return line
}

const maximumWhenLineWidth = 80

func hasPublicSections(body []string, rawBody []string) bool {
	if len(body) < 8 || body[0] != "Scope: public" || body[1] != "" {
		return false
	}

	whenEnd := -1
	for index := 3; index < len(body); index++ {
		if body[index] == "" {
			whenEnd = index
			break
		}
	}
	if whenEnd == -1 {
		return false
	}

	firstWhenLine := body[2]
	hasWhenContent := strings.HasPrefix(firstWhenLine, "When to use: ") && strings.TrimSpace(strings.TrimPrefix(firstWhenLine, "When to use: ")) != ""
	if firstWhenLine != "When to use:" && !hasWhenContent {
		return false
	}
	for index := 2; index < whenEnd; index++ {
		if len([]rune(rawBody[index])) > maximumWhenLineWidth {
			return false
		}
		if index > 2 && body[index] != "" {
			hasWhenContent = true
		}
	}
	if !hasWhenContent {
		return false
	}

	exampleIndex := whenEnd + 1
	if exampleIndex+1 >= len(body) || body[exampleIndex] != "Example:" || body[exampleIndex+1] != "```ts" || body[len(body)-1] != "```" {
		return false
	}
	hasContent := false
	for _, line := range body[exampleIndex+2 : len(body)-1] {
		if strings.Contains(line, "console.log") {
			return false
		}
		if strings.TrimSpace(line) != "" {
			hasContent = true
		}
	}
	return hasContent
}

func isStructuredJSDoc(text string) bool {
	lines := strings.Split(strings.ReplaceAll(text, "\r\n", "\n"), "\n")
	if len(lines) < 5 || strings.TrimSpace(lines[0]) != "/**" {
		return false
	}
	closing := strings.TrimSpace(lines[len(lines)-1])
	if closing != "*/" && closing != "**/" {
		return false
	}

	rawBody := lines[1 : len(lines)-1]
	body := make([]string, len(rawBody))
	for index, line := range rawBody {
		body[index] = normalizeLine(line)
	}
	if body[0] != "" || body[len(body)-1] != "" {
		return false
	}
	body = body[1 : len(body)-1]
	rawBody = rawBody[1 : len(rawBody)-1]

	if len(body) == 1 && body[0] == "Scope: private" {
		return true
	}
	return hasPublicSections(body, rawBody)
}

func hasStructuredJSDoc(factory *ast.NodeFactory, source string, node *ast.Node) bool {
	for _, comment := range parser.GetJSDocCommentRanges(factory, nil, node, source) {
		if isStructuredJSDoc(source[comment.Pos():comment.End()]) {
			return true
		}
	}
	return false
}

var Rule = rule.Rule{
	Name: "require-export-jsdoc",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		factory := ast.NewNodeFactory(ast.NodeFactoryHooks{})
		check := func(reportNode *ast.Node, documentationNode *ast.Node) {
			if hasStructuredJSDoc(factory, ctx.SourceFile.Text(), documentationNode) {
				return
			}
			ctx.ReportNode(reportNode, message)
		}
		return rule.RuleListeners{
			ast.KindExportKeyword: func(node *ast.Node) {
				if node.Parent == nil || node.Flags&ast.NodeFlagsReparsed != 0 {
					return
				}
				check(node, node.Parent)
			},
			ast.KindExportDeclaration: func(node *ast.Node) { check(node, node) },
			ast.KindExportAssignment:  func(node *ast.Node) { check(node, node) },
		}
	},
}
