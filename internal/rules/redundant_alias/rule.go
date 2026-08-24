package redundant_alias

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/scanner"
)

var reference = regexp.MustCompile(`^(?:Omit|Partial|Pick|Readonly|Required)?\s*<?\s*([A-Za-z_$][\w$]*)`)
var Rule = rule.Rule{Name: "redundant-alias", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{
		ast.KindInterfaceDeclaration: func(node *ast.Node) {
			d := node.AsInterfaceDeclaration()
			if d.Name() == nil || d.Members == nil || len(d.Members.Nodes) != 0 || d.HeritageClauses == nil || len(d.HeritageClauses.Nodes) != 1 {
				return
			}
			h := d.HeritageClauses.Nodes[0].AsHeritageClause()
			if h.Types == nil || len(h.Types.Nodes) != 1 {
				return
			}
			target := strings.TrimSpace(scanner.GetTextOfNodeFromSourceText(ctx.SourceFile.Text(), h.Types.Nodes[0], false))
			report(ctx, d.Name(), target)
		},
		ast.KindTypeAliasDeclaration: func(node *ast.Node) {
			d := node.AsTypeAliasDeclaration()
			if d.Name() == nil {
				return
			}
			text := strings.TrimSpace(scanner.GetTextOfNodeFromSourceText(ctx.SourceFile.Text(), d.Type, false))
			m := reference.FindStringSubmatch(text)
			if len(m) > 1 {
				report(ctx, d.Name(), m[1])
			}
		},
	}
}}

func report(ctx rule.RuleContext, name *ast.Node, target string) {
	n := name.Text()
	if n == target || target == "" {
		return
	}
	ctx.ReportNode(name, rule.RuleMessage{Id: "redundant-alias", Description: fmt.Sprintf("%s renames %s without adding independent semantics.", n, target), Help: fmt.Sprintf("Use %s directly, merge the concepts, or add a real invariant or independently evolving boundary. Do not keep a second name only to describe structural use.", target)})
}
