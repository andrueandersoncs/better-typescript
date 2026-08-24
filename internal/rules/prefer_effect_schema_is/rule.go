package prefer_effect_schema_is

import (
	"fmt"
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
	"github.com/microsoft/typescript-go/shim/scanner"
	"strings"
)

var Rule = rule.Rule{Name: "prefer-effect-schema-is", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindBinaryExpression: func(node *ast.Node) {
		binary := node.AsBinaryExpression()
		negated := binary.OperatorToken.Kind == ast.KindExclamationEqualsEqualsToken
		if !negated && binary.OperatorToken.Kind != ast.KindEqualsEqualsEqualsToken {
			return
		}
		access, literal := tagAccess(binary.Left), stringLiteral(binary.Right)
		if access == nil || literal == nil {
			access, literal = tagAccess(binary.Right), stringLiteral(binary.Left)
		}
		if access == nil || literal == nil || !firstPartyType(ctx, ctx.TypeChecker.GetTypeAtLocation(access.AsPropertyAccessExpression().Expression)) {
			return
		}
		value := scanner.GetSourceTextOfNodeFromSourceFile(ctx.SourceFile, access.AsPropertyAccessExpression().Expression, false)
		operator := scanner.GetSourceTextOfNodeFromSourceFile(ctx.SourceFile, binary.OperatorToken, false)
		tag := literal.Text()
		check := fmt.Sprintf("Schema.is($schema)(%s)", value)
		if negated {
			check = "!" + check
		}
		ctx.ReportNode(node, rule.RuleMessage{Id: "prefer-effect-schema-is", Description: fmt.Sprintf("Avoid checking %s._tag %s %q directly.", value, operator, tag), Help: fmt.Sprintf("Replace the tag check with %s, using the Effect Schema class for %q.", check, tag)})
	}}
}}

func tagAccess(n *ast.Node) *ast.Node {
	n = unwrap(n)
	if ast.IsPropertyAccessExpression(n) && propertyName(n) == "_tag" {
		return n
	}
	return nil
}
func stringLiteral(n *ast.Node) *ast.Node {
	n = unwrap(n)
	if ast.IsStringLiteralLike(n) {
		return n
	}
	return nil
}
func firstPartyType(ctx rule.RuleContext, t *checker.Type) bool {
	parts := utils.UnionTypeParts(t)
	if len(parts) == 0 {
		return false
	}
	for _, part := range parts {
		symbol := checker.Type_symbol(part)
		if symbol == nil {
			return false
		}
		firstParty := false
		for _, d := range symbol.Declarations {
			f := ast.GetSourceFileOfNode(d)
			if f != nil && !f.IsDeclarationFile && !strings.Contains(strings.ReplaceAll(f.FileName(), "\\", "/"), "/node_modules/") {
				firstParty = true
			}
		}
		if !firstParty {
			return false
		}
	}
	return true
}
func propertyName(n *ast.Node) string {
	name := n.Name()
	if name != nil && ast.IsIdentifier(name) {
		return name.AsIdentifier().Text
	}
	return ""
}
func unwrap(n *ast.Node) *ast.Node {
	for n != nil {
		switch n.Kind {
		case ast.KindParenthesizedExpression, ast.KindAsExpression, ast.KindTypeAssertionExpression, ast.KindNonNullExpression, ast.KindSatisfiesExpression:
			n = n.Expression()
		default:
			return n
		}
	}
	return n
}

var PreferEffectSchemaIsRule = Rule
