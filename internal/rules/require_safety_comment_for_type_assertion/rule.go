package require_safety_comment_for_type_assertion

import (
	"regexp"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/scanner"
)

type comment struct {
	start int
	end   int
	text  string
}

var safetyMarker = regexp.MustCompile(`(^|[^[:alnum:]_])SAFETY[[:space:]]*:[[:space:]]*\S`)
var message = rule.RuleMessage{
	Id:          "require-safety-comment-for-type-assertion",
	Description: "This type assertion has no `SAFETY:` justification.",
	Help:        "State the checked invariant immediately before the assertion or its containing statement, and explain it using `because`.",
}

func comments(source string) []comment {
	lex := scanner.NewScanner()
	lex.SetSkipTrivia(false)
	lex.SetText(source)
	var result []comment
	for kind := lex.Scan(); kind != ast.KindEndOfFile; kind = lex.Scan() {
		if kind != ast.KindSingleLineCommentTrivia && kind != ast.KindMultiLineCommentTrivia {
			continue
		}
		start, end := lex.TokenStart(), lex.TokenEnd()
		text := source[start:end]
		if kind == ast.KindSingleLineCommentTrivia {
			text = strings.TrimPrefix(text, "//")
		} else {
			text = strings.TrimSuffix(strings.TrimPrefix(text, "/*"), "*/")
		}
		result = append(result, comment{start: start, end: end, text: text})
	}
	return result
}

func constAssertion(node *ast.Node) bool {
	typeNode := node.Type()
	return typeNode != nil && ast.IsTypeReferenceNode(typeNode) && ast.IsIdentifier(typeNode.AsTypeReferenceNode().TypeName) && typeNode.AsTypeReferenceNode().TypeName.Text() == "const"
}

func leadingSafety(ctx rule.RuleContext, current, assertion *ast.Node, all []comment) bool {
	source := ctx.SourceFile.Text()
	start := scanner.GetTokenPosOfNode(current, ctx.SourceFile, false)
	assertionStart := scanner.GetTokenPosOfNode(assertion, ctx.SourceFile, false)
	for _, candidate := range all {
		if candidate.end > assertionStart || candidate.end > start || !safetyMarker.MatchString(candidate.text) {
			continue
		}
		if strings.TrimSpace(source[candidate.end:start]) == "" {
			return true
		}
	}
	return false
}

func justified(ctx rule.RuleContext, node *ast.Node, all []comment) bool {
	for current := node; current != nil && !ast.IsSourceFile(current); current = current.Parent {
		if leadingSafety(ctx, current, node, all) {
			return true
		}
		switch current.Kind {
		case ast.KindExpressionStatement, ast.KindPropertyDeclaration, ast.KindReturnStatement, ast.KindThrowStatement, ast.KindVariableStatement:
			return false
		}
	}
	return false
}

func run(ctx rule.RuleContext, _ any) rule.RuleListeners {
	all := comments(ctx.SourceFile.Text())
	check := func(node *ast.Node) {
		if !constAssertion(node) && !justified(ctx, node, all) {
			ctx.ReportNode(node, message)
		}
	}
	return rule.RuleListeners{
		ast.KindAsExpression:            check,
		ast.KindTypeAssertionExpression: check,
	}
}

var Rule = rule.Rule{Name: "require-safety-comment-for-type-assertion", Run: run}
