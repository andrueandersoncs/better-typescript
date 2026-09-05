package require_because_in_comments

import (
	"regexp"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/typescript-go/ast"
	"github.com/andrueandersoncs/typescript-go/core"
	"github.com/andrueandersoncs/typescript-go/parser"
	"github.com/andrueandersoncs/typescript-go/scanner"
)

var becauseWord = regexp.MustCompile(`(?i)(^|[^\pL\pM\pN_])because([^\pL\pM\pN_]|$)`)
var barrelMarker = regexp.MustCompile(`^//\s*@barrel(?:\([^)]*\))?(?::|\s|$)`)
var doctestMarker = regexp.MustCompile(`^// => .+$`)
var message = rule.RuleMessage{Id: "require-because-in-comments", Description: `Comments must explain why using the word "because".`, Help: "Delete the comment if it does not explain a reason."}

var jsDocKinds = []ast.Kind{
	ast.KindArrowFunction,
	ast.KindCallSignature,
	ast.KindClassDeclaration,
	ast.KindClassExpression,
	ast.KindConstructSignature,
	ast.KindConstructor,
	ast.KindEnumDeclaration,
	ast.KindEnumMember,
	ast.KindExportDeclaration,
	ast.KindExportSpecifier,
	ast.KindFunctionDeclaration,
	ast.KindFunctionExpression,
	ast.KindGetAccessor,
	ast.KindImportDeclaration,
	ast.KindIndexSignature,
	ast.KindInterfaceDeclaration,
	ast.KindMethodDeclaration,
	ast.KindMethodSignature,
	ast.KindModuleDeclaration,
	ast.KindParameter,
	ast.KindPropertyDeclaration,
	ast.KindPropertyAssignment,
	ast.KindPropertySignature,
	ast.KindSetAccessor,
	ast.KindTypeAliasDeclaration,
	ast.KindTypeParameter,
	ast.KindVariableDeclaration,
	ast.KindVariableStatement,
}

var Rule = rule.Rule{
	Name: "require-because-in-comments",
	Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
		factory := ast.NewNodeFactory(ast.NodeFactoryHooks{})
		parsedJSDoc := map[int]int{}
		regexpStarts := map[int]bool{}
		templateStarts := map[int]bool{}
		rememberJSDoc := func(node *ast.Node) {
			if len(node.JSDoc(ctx.SourceFile)) == 0 {
				return
			}
			for _, comment := range parser.GetJSDocCommentRanges(factory, nil, node, ctx.SourceFile.Text()) {
				parsedJSDoc[comment.Pos()] = comment.End()
			}
		}
		listeners := rule.RuleListeners{
			ast.KindEndOfFile: func(node *ast.Node) {
				rememberJSDoc(node)
				rememberJSDoc(ctx.SourceFile.AsNode())
				reportComments(ctx, parsedJSDoc, regexpStarts, templateStarts)
			},
			ast.KindRegularExpressionLiteral: func(node *ast.Node) {
				regexpStarts[scanner.GetTokenPosOfNode(node, ctx.SourceFile, false)] = true
			},
			ast.KindTemplateHead: func(node *ast.Node) {
				templateStarts[scanner.GetTokenPosOfNode(node, ctx.SourceFile, false)] = true
			},
			ast.KindTemplateMiddle: func(node *ast.Node) {
				templateStarts[scanner.GetTokenPosOfNode(node, ctx.SourceFile, false)] = true
			},
			ast.KindTemplateTail: func(node *ast.Node) {
				templateStarts[scanner.GetTokenPosOfNode(node, ctx.SourceFile, false)] = true
			},
		}
		for _, kind := range jsDocKinds {
			listeners[kind] = rememberJSDoc
		}
		return listeners
	},
}

func reportComments(ctx rule.RuleContext, parsedJSDoc map[int]int, regexpStarts, templateStarts map[int]bool) {
	text := ctx.SourceFile.Text()
	lex := scanner.NewScanner()
	lex.SetSkipTrivia(false)
	lex.SetLanguageVariant(ctx.SourceFile.LanguageVariant)
	lex.SetText(text)
	for kind := lex.Scan(); kind != ast.KindEndOfFile; kind = lex.Scan() {
		start := lex.TokenStart()
		if regexpStarts[start] && (kind == ast.KindSlashToken || kind == ast.KindSlashEqualsToken) {
			kind = lex.ReScanSlashToken()
		}
		if templateStarts[start] && (kind == ast.KindBacktickToken || kind == ast.KindCloseBraceToken) {
			kind = lex.ReScanTemplateToken(false)
		}
		if kind != ast.KindSingleLineCommentTrivia && kind != ast.KindMultiLineCommentTrivia {
			continue
		}
		end := lex.TokenEnd()
		comment := text[start:end]
		if parsedJSDoc[start] == end || isMachineComment(kind, comment) || becauseWord.MatchString(comment) {
			continue
		}
		ctx.ReportRange(core.NewTextRange(start, end), message)
	}
}

func isMachineComment(kind ast.Kind, text string) bool {
	return kind == ast.KindSingleLineCommentTrivia && (barrelMarker.MatchString(text) || doctestMarker.MatchString(text))
}
