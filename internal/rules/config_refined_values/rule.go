package config_refined_values

import (
	"path/filepath"
	"regexp"
	"strings"

	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/andrueandersoncs/better-typescript/internal/utils"
	"github.com/andrueandersoncs/typescript-go/ast"
)

var message = rule.RuleMessage{
	Id:          "config-refined-values",
	Description: "Refine configuration values.",
	Help:        "Use Config.URL or Config.schema with a suitable Schema for path, URL, port, and identifier values.",
}

var refinedKey = regexp.MustCompile(`(?i)(path|dir|directory|folder|url|uri|host|hostname|endpoint|base[_-]?url|port|id|uuid|identifier|slug|email)$`)

var Rule = rule.Rule{Name: "config-refined-values", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		if !isEffectConfigCall(ctx, node.AsCallExpression().Expression, "String") || immediatelyRefined(ctx, node) {
			return
		}
		args := node.AsCallExpression().Arguments.Nodes
		if len(args) == 0 || !ast.IsStringLiteralLike(unwrap(args[0])) {
			return
		}
		key := unwrap(args[0]).Text()
		if key == "" || !refinedKey.MatchString(key) {
			return
		}
		ctx.ReportNode(node.AsCallExpression().Expression, message)
	}}
}}

func isEffectConfigCall(ctx rule.RuleContext, callee *ast.Node, name string) bool {
	callee = unwrap(callee)
	if ast.IsPropertyAccessExpression(callee) {
		callee = callee.AsPropertyAccessExpression().Name()
	}
	if !ast.IsIdentifier(callee) {
		return false
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, callee)
	if symbol == nil || symbol.Name != name {
		return false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		path := strings.ReplaceAll(file.FileName(), "\\", "/")
		if (filepath.Base(path) == "Config.ts" || filepath.Base(path) == "Config.d.ts") &&
			(strings.Contains(path, "/node_modules/effect/") || strings.Contains(path, "/packages/effect/src/")) {
			return true
		}
	}
	return false
}

func immediatelyRefined(ctx rule.RuleContext, source *ast.Node) bool {
	parent := source.Parent
	if ast.IsCallExpression(parent) {
		call := parent.AsCallExpression()
		if len(call.Arguments.Nodes) != 2 || call.Arguments.Nodes[0] != source {
			return false
		}
		return configMapRefines(ctx, call.Expression, call.Arguments.Nodes[1])
	}
	if !ast.IsPropertyAccessExpression(parent) || parent.AsPropertyAccessExpression().Expression != source || parent.Name() == nil || parent.Name().Text() != "pipe" {
		return false
	}
	call := parent.Parent
	if !ast.IsCallExpression(call) || len(call.AsCallExpression().Arguments.Nodes) != 1 {
		return false
	}
	mapper := call.AsCallExpression().Arguments.Nodes[0]
	if !ast.IsCallExpression(mapper) {
		return false
	}
	mapCall := mapper.AsCallExpression()
	if len(mapCall.Arguments.Nodes) != 1 {
		return false
	}
	return configMapRefines(ctx, mapCall.Expression, mapCall.Arguments.Nodes[0])
}

func configMapRefines(ctx rule.RuleContext, callee, mapper *ast.Node) bool {
	if isEffectConfigCall(ctx, callee, "map") {
		return schemaMakeMapper(ctx, mapper)
	}
	return isEffectConfigCall(ctx, callee, "mapEffect") && schemaDecoderMapper(ctx, mapper)
}

func schemaMakeMapper(ctx rule.RuleContext, mapper *ast.Node) bool {
	body, parameter, ok := mapperBodyAndParameter(mapper)
	if !ok || !ast.IsCallExpression(body) {
		return false
	}
	call := body.AsCallExpression()
	if len(call.Arguments.Nodes) != 1 || !sameResolvedSymbol(ctx, call.Arguments.Nodes[0], parameter) {
		return false
	}
	callee := unwrap(call.Expression)
	return ast.IsPropertyAccessExpression(callee) && isEffectSchemaMember(ctx, callee.AsPropertyAccessExpression().Name(), "make")
}

func schemaDecoderMapper(ctx rule.RuleContext, mapper *ast.Node) bool {
	body, parameter, ok := mapperBodyAndParameter(mapper)
	if !ok {
		return false
	}
	if !ast.IsCallExpression(body) {
		return false
	}
	pipe := body.AsCallExpression()
	if len(pipe.Arguments.Nodes) != 1 {
		return false
	}
	callee := unwrap(pipe.Expression)
	return ast.IsPropertyAccessExpression(callee) && callee.AsPropertyAccessExpression().Name() != nil &&
		callee.AsPropertyAccessExpression().Name().Text() == "pipe" &&
		schemaDecoderCall(ctx, callee.AsPropertyAccessExpression().Expression, parameter) &&
		isEffectMapErrorCall(ctx, pipe.Arguments.Nodes[0])
}

func mapperBodyAndParameter(mapper *ast.Node) (*ast.Node, *ast.Node, bool) {
	if !ast.IsArrowFunction(mapper) {
		return nil, nil, false
	}
	parameters := mapper.AsArrowFunction().Parameters.Nodes
	body := mapper.BodyData().Body
	if len(parameters) != 1 || body == nil || ast.IsBlock(body) || !ast.IsIdentifier(parameters[0].Name()) {
		return nil, nil, false
	}
	return unwrap(body), parameters[0].Name(), true
}

func schemaDecoderCall(ctx rule.RuleContext, node, parameter *ast.Node) bool {
	node = unwrap(node)
	if !ast.IsCallExpression(node) {
		return false
	}
	call := node.AsCallExpression()
	if len(call.Arguments.Nodes) != 1 || !sameResolvedSymbol(ctx, call.Arguments.Nodes[0], parameter) {
		return false
	}
	callee := unwrap(call.Expression)
	return ast.IsCallExpression(callee) && isEffectSchemaMember(ctx, callee.AsCallExpression().Expression, "decodeUnknownEffect")
}

func isEffectMapErrorCall(ctx rule.RuleContext, node *ast.Node) bool {
	node = unwrap(node)
	if !ast.IsCallExpression(node) {
		return false
	}
	callee := unwrap(node.AsCallExpression().Expression)
	if ast.IsPropertyAccessExpression(callee) {
		callee = callee.AsPropertyAccessExpression().Name()
	}
	if !ast.IsIdentifier(callee) {
		return false
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, callee)
	if symbol == nil || symbol.Name != "mapError" {
		return false
	}
	for _, declaration := range symbol.Declarations {
		file := ast.GetSourceFileOfNode(declaration)
		if file == nil {
			continue
		}
		path := strings.ReplaceAll(file.FileName(), "\\", "/")
		if (filepath.Base(path) == "Effect.ts" || filepath.Base(path) == "Effect.d.ts") &&
			(strings.Contains(path, "/node_modules/effect/") || strings.Contains(path, "/packages/effect/src/")) {
			return true
		}
	}
	return false
}

func sameResolvedSymbol(ctx rule.RuleContext, left, right *ast.Node) bool {
	left, right = unwrap(left), unwrap(right)
	if !ast.IsIdentifier(left) || !ast.IsIdentifier(right) {
		return false
	}
	return utils.ResolvedSymbol(ctx.TypeChecker, left) == utils.ResolvedSymbol(ctx.TypeChecker, right)
}

func isEffectSchemaMember(ctx rule.RuleContext, node *ast.Node, name string) bool {
	node = unwrap(node)
	if ast.IsPropertyAccessExpression(node) {
		node = node.AsPropertyAccessExpression().Name()
	}
	if !ast.IsIdentifier(node) {
		return false
	}
	symbol := utils.ResolvedSymbol(ctx.TypeChecker, node)
	return symbol != nil && symbol.Name == name && utils.IsEffectSchemaSymbol(symbol)
}

func unwrap(node *ast.Node) *ast.Node {
	for node != nil {
		switch node.Kind {
		case ast.KindParenthesizedExpression, ast.KindAsExpression, ast.KindSatisfiesExpression, ast.KindTypeAssertionExpression, ast.KindNonNullExpression:
			node = node.Expression()
		default:
			return node
		}
	}
	return nil
}
