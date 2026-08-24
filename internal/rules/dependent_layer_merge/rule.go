package dependent_layer_merge

import (
	"github.com/andrueandersoncs/better-typescript/internal/rule"
	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
	"strings"
)

var message = rule.RuleMessage{
	Id:          "dependent-layer-merge",
	Description: "Compose dependent layers with Layer.provide or Layer.provideMerge, not Layer.merge.",
	Help:        "Use Layer.provide to hide dependency services, or Layer.provideMerge to keep them exposed; reserve merge and mergeAll for independent layers.",
}

type channels struct{ output, input *checker.Type }

var Rule = rule.Rule{Name: "dependent-layer-merge", Run: func(ctx rule.RuleContext, _ any) rule.RuleListeners {
	return rule.RuleListeners{ast.KindCallExpression: func(node *ast.Node) {
		name, receiver, ok := callName(node)
		if !ok || (name != "merge" && name != "mergeAll") || receiver == nil || !strings.HasSuffix(nodeText(ctx.SourceFile, receiver), "Layer") {
			return
		}
		var values []*ast.Node
		for _, argument := range node.AsCallExpression().Arguments.Nodes {
			current := unwrap(argument)
			if ast.IsArrayLiteralExpression(current) {
				values = append(values, current.AsArrayLiteralExpression().Elements.Nodes...)
			} else {
				values = append(values, current)
			}
		}
		pairs := make([]channels, 0, len(values))
		for _, value := range values {
			if c, found := layerChannels(ctx, value); found {
				pairs = append(pairs, c)
			}
		}
		for i, provider := range pairs {
			for j, dependent := range pairs {
				if i != j && certain(provider.output) && certain(dependent.input) && checker.Checker_isTypeAssignableTo(ctx.TypeChecker, dependent.input, provider.output) {
					ctx.ReportNode(node, message)
					return
				}
			}
		}
	}}
}}

func layerChannels(ctx rule.RuleContext, expression *ast.Node) (channels, bool) {
	t := ctx.TypeChecker.GetTypeAtLocation(expression)
	if t == nil || !strings.Contains(ctx.TypeChecker.TypeToString(t), "Layer") {
		return channels{}, false
	}
	if checker.Type_flags(t)&checker.TypeFlagsObject == 0 || checker.Type_objectFlags(t)&checker.ObjectFlagsReference == 0 {
		return channels{}, false
	}
	args := checker.Checker_getTypeArguments(ctx.TypeChecker, t)
	if len(args) < 3 {
		return channels{}, false
	}
	return channels{output: args[0], input: args[2]}, true
}
func certain(t *checker.Type) bool {
	if t == nil {
		return false
	}
	flags := checker.Type_flags(t)
	uncertain := checker.TypeFlagsAny | checker.TypeFlagsUnknown | checker.TypeFlagsTypeParameter | checker.TypeFlagsNever
	return flags&uncertain == 0
}

func unwrap(node *ast.Node) *ast.Node {
	for node != nil {
		switch node.Kind {
		case ast.KindParenthesizedExpression:
			node = node.AsParenthesizedExpression().Expression
		case ast.KindAsExpression, ast.KindSatisfiesExpression, ast.KindTypeAssertionExpression:
			node = node.Expression()
		case ast.KindNonNullExpression:
			node = node.Expression()
		default:
			return node
		}
	}
	return nil
}

func propertyName(node *ast.Node) (string, *ast.Node, bool) {
	node = unwrap(node)
	if node == nil || !ast.IsPropertyAccessExpression(node) {
		return "", nil, false
	}
	return node.Name().Text(), node.AsPropertyAccessExpression().Expression, true
}

func callName(node *ast.Node) (string, *ast.Node, bool) {
	if node == nil || !ast.IsCallExpression(node) {
		return "", nil, false
	}
	call := node.AsCallExpression()
	name, receiver, ok := propertyName(call.Expression)
	if ok {
		return name, receiver, true
	}
	callee := unwrap(call.Expression)
	if callee != nil && ast.IsIdentifier(callee) {
		return callee.Text(), nil, true
	}
	return "", nil, false
}

func nodeText(file *ast.SourceFile, node *ast.Node) string {
	if node == nil {
		return ""
	}
	start, end := node.Pos(), node.End()
	text := file.Text()
	if start < 0 {
		start = 0
	}
	if end > len(text) {
		end = len(text)
	}
	if end < start {
		return ""
	}
	return strings.TrimSpace(text[start:end])
}

func walk(node *ast.Node, visit func(*ast.Node) bool) bool {
	if node == nil {
		return false
	}
	if visit(node) {
		return true
	}
	found := false
	node.ForEachChild(func(child *ast.Node) bool {
		if walk(child, visit) {
			found = true
			return true
		}
		return false
	})
	return found
}

func enclosingFunction(node *ast.Node) *ast.Node {
	for current := node.Parent; current != nil; current = current.Parent {
		if ast.IsFunctionLike(current) {
			return current
		}
	}
	return nil
}
